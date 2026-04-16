#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stateDir = path.join(repoRoot, '.autopilot');
const validatorLogsDir = path.join(stateDir, 'validator-logs');
const validatorFinalsDir = path.join(stateDir, 'validator-finals');
const validatorStatusPath = path.join(stateDir, 'validator-status.json');
const validatorEventsPath = path.join(stateDir, 'validator-events.log');
const validatorLockPath = path.join(stateDir, 'validator.lock');
const directivePath = path.join(stateDir, 'directive.md');
const directiveOverridePath = path.join(stateDir, 'directive.override.md');
const runnerStatusPath = path.join(stateDir, 'status.json');
const runnerPlistPath = path.join(os.homedir(), 'Library/LaunchAgents/com.rolangbeauty.autopilot.runner.plist');
const issueSyncScript = path.join(repoRoot, 'scripts', 'autopilot-issue-sync.mjs');

const intervalMs = Math.max(60000, Number(process.env.AUTOPILOT_VALIDATOR_INTERVAL_MS ?? '600000'));
const staleMs = Math.max(intervalMs + 60000, Number(process.env.AUTOPILOT_VALIDATOR_STALE_MS ?? '900000'));
const recoveryCooldownMs = Math.max(intervalMs, Number(process.env.AUTOPILOT_VALIDATOR_RECOVERY_COOLDOWN_MS ?? '1800000'));
const recoveryCodexTimeoutMs = Math.max(
  60000,
  Number(process.env.AUTOPILOT_VALIDATOR_CODEX_TIMEOUT_MS ?? '120000'),
);
const maxRecoveries = Math.max(0, Number(process.env.AUTOPILOT_VALIDATOR_MAX_RECOVERIES ?? '6'));
const recoveryDirtyPathThreshold = Math.max(
  1,
  Number(process.env.AUTOPILOT_VALIDATOR_RECOVERY_DIRTY_PATH_THRESHOLD ?? '12'),
);
const recoveryCodexModel =
  process.env.AUTOPILOT_VALIDATOR_CODEX_MODEL?.trim() || process.env.AUTOPILOT_CODEX_MODEL?.trim() || '';
const uid = process.getuid?.() ?? Number(execFileSync('id', ['-u'], { encoding: 'utf8' }).trim());
const runnerLabel = `gui/${uid}/com.rolangbeauty.autopilot.runner`;

const BASE_DIRECTIVE = `Primary direction
- Improve the Shopify theme preview and safe repo cleanup with minimal churn.
- Prefer small, customer-visible fixes in \`rolang-beauty-theme/\` over repo-wide edits.

Boundaries
- Do not touch or publish the live Shopify theme.
- Do not edit generated CSV/report files unless a script change in the same iteration requires regeneration.
- Do not roam across the repo. Avoid \`src/\` except for clearly broken legacy references, and do not delete legacy catalog files unattended.
- Do not create or replace binary assets unless fixing a broken favicon/reference.
- Do not widen the dirty worktree. Reuse already-dirty theme files when possible.
- If no safe one-file fix is obvious, create one issue draft instead of making filler edits.

Good targets
- \`rolang-beauty-theme/sections/*.liquid\`
- \`rolang-beauty-theme/assets/rolang-beauty.css\`
- \`rolang-beauty-theme/snippets/meta-tags.liquid\`
- \`README.md\` or deploy docs only when they reduce operational confusion`;

function ensureStateDirs() {
  for (const dir of [stateDir, validatorLogsDir, validatorFinalsDir]) {
    mkdirSync(dir, { recursive: true });
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function readText(filePath) {
  try {
    return readFileSync(filePath, 'utf8').trim();
  } catch {
    return '';
  }
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function appendEvent(message) {
  writeFileSync(validatorEventsPath, `${new Date().toISOString()} ${message}\n`, {
    encoding: 'utf8',
    flag: 'a',
  });
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function claimValidatorLock() {
  const existingLock = readJson(validatorLockPath);

  if (existingLock?.pid && existingLock.pid !== process.pid && isProcessAlive(existingLock.pid)) {
    process.exit(0);
  }

  writeJson(validatorLockPath, {
    pid: process.pid,
    claimedAt: new Date().toISOString(),
  });
}

function cleanupValidatorLock() {
  try {
    const existingLock = readJson(validatorLockPath);
    if (!existingLock || existingLock.pid === process.pid) {
      rmSync(validatorLockPath, { force: true });
    }
  } catch {
    // Best effort only.
  }
}

function runCommand(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    ...options,
  }).trim();
}

function runResult(command, args, options = {}) {
  try {
    return {
      ok: true,
      code: 0,
      output: runCommand(command, args, options),
    };
  } catch (error) {
    return {
      ok: false,
      code: error.status ?? 1,
      output:
        error.stderr?.toString().trim() ||
        error.stdout?.toString().trim() ||
        (error instanceof Error ? error.message : String(error)),
    };
  }
}

function parseStatusPath(statusLine) {
  const raw = statusLine.slice(3).trim();
  const candidate = raw.includes(' -> ') ? raw.split(' -> ').pop() : raw;
  return candidate.replace(/^"|"$/g, '');
}

function listDirtyStatusLines() {
  const result = runResult('git', ['status', '--short', '--untracked-files=all']);
  return result.output ? result.output.split('\n').filter(Boolean) : [];
}

function listDirtyFiles(statusLines) {
  return statusLines.map(parseStatusPath).filter(Boolean);
}

function validateJsonFile(relativePath) {
  try {
    JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8'));
    return {
      ok: true,
      code: 0,
      output: '',
    };
  } catch (error) {
    return {
      ok: false,
      code: 1,
      output: error instanceof Error ? error.message : String(error),
    };
  }
}

function validateWorktree(dirtyFiles) {
  const checks = [];

  checks.push({
    name: 'git diff --check',
    ...runResult('git', ['diff', '--check']),
  });

  if (dirtyFiles.some((file) => file.startsWith('rolang-beauty-theme/'))) {
    checks.push({
      name: 'shopify theme check --path rolang-beauty-theme',
      ...runResult('shopify', ['theme', 'check', '--path', 'rolang-beauty-theme']),
    });
  }

  const scriptFiles = [...new Set(dirtyFiles.filter((file) => file.endsWith('.mjs') && existsSync(path.join(repoRoot, file))))];
  for (const scriptFile of scriptFiles) {
    checks.push({
      name: `node --check ${scriptFile}`,
      ...runResult('node', ['--check', scriptFile]),
    });
  }

  const jsonFiles = [
    ...new Set(
      dirtyFiles.filter(
        (file) =>
          file.endsWith('.json') &&
          !file.startsWith('rolang-beauty-theme/') &&
          !file.startsWith('.autopilot/') &&
          existsSync(path.join(repoRoot, file)),
      ),
    ),
  ];
  for (const jsonFile of jsonFiles) {
    checks.push({
      name: `json parse ${jsonFile}`,
      ...validateJsonFile(jsonFile),
    });
  }

  return {
    passed: checks.every((check) => check.ok),
    checks,
    failed: checks.filter((check) => !check.ok),
  };
}

function summarizeChecks(checks) {
  if (checks.length === 0) {
    return '- none';
  }

  return checks
    .map((check) => {
      const output = check.output ? ` :: ${check.output.split('\n').slice(0, 4).join(' | ')}` : '';
      return `- ${check.name}${output}`;
    })
    .join('\n');
}

function buildDirective({ dirtyFiles, validations, runnerStatus, runnerAlive, runnerStale }) {
  const lines = [BASE_DIRECTIVE, '', 'Current steering'];

  if (validations.failed.length > 0) {
    lines.push(
      `- First repair validator failures before any new improvement: ${validations.failed.map((check) => check.name).join(', ')}.`,
    );
  } else {
    lines.push('- Current repo validators pass. Keep changes small, verified, and customer-facing.');
  }

  if (dirtyFiles.length > 0) {
    const preview = dirtyFiles.slice(0, 6).map((file) => `\`${file}\``).join(', ');
    lines.push(`- Prefer these current dirty paths: ${preview}${dirtyFiles.length > 6 ? ', ...' : ''}.`);
  } else {
    lines.push('- Working tree is currently clean. Do not widen it without a strong reason.');
  }

  if (runnerStale || runnerStatus?.lastExitCode === 124) {
    lines.push('- Recent stall or timeout detected. Favor one-file changes with immediate verification.');
  }

  if (runnerAlive && !runnerStale) {
    lines.push('- Main runner is active. The validator should steer and validate, not race it with concurrent edits.');
  } else {
    lines.push('- Main runner is offline or stale. The validator may restart it or take one conservative recovery pass.');
  }

  lines.push('- Do not publish or push Shopify themes from unattended automation. Keep changes local and preview-safe.');

  const manualOverride = readText(directiveOverridePath);
  if (manualOverride) {
    lines.push('', 'Manual override', manualOverride);
  }

  lines.push('', 'Validator snapshot');
  lines.push(`- Dirty path count: ${dirtyFiles.length}`);
  lines.push(`- Runner phase: ${runnerStatus?.phase ?? 'unknown'}`);
  lines.push(
    `- Runner completed loops: ${Number(runnerStatus?.completedLoops ?? 0)}/${Number(runnerStatus?.maxLoops ?? 0) || 'unknown'}`,
  );
  lines.push(`- Failing checks: ${validations.failed.length > 0 ? validations.failed.map((check) => check.name).join(', ') : 'none'}`);

  return `${lines.join('\n')}\n`;
}

function sleep(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function runIssueSync() {
  return runResult('node', [issueSyncScript]);
}

function shouldAttemptRecovery(previousValidatorStatus, dirtyFiles, runnerStatus) {
  if (dirtyFiles.length > recoveryDirtyPathThreshold) {
    return false;
  }

  if ((previousValidatorStatus?.recoveryCount ?? 0) >= maxRecoveries) {
    return false;
  }

  const lastRecoveryAt = Date.parse(previousValidatorStatus?.lastRecoveryAt ?? '');
  if (Number.isFinite(lastRecoveryAt) && Date.now() - lastRecoveryAt < recoveryCooldownMs) {
    return false;
  }

  if (runnerStatus?.phase === 'completed') {
    return false;
  }

  return true;
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function runRecoveryCodex({ runnerStatus, dirtyStatusLines, validations }) {
  const slug = timestampSlug();
  const logPath = path.join(validatorLogsDir, `recovery-${slug}.log`);
  const finalPath = path.join(validatorFinalsDir, `recovery-${slug}.txt`);
  const dirtyPreview = dirtyStatusLines.length > 0 ? dirtyStatusLines.slice(0, 20).join('\n') : '(clean working tree)';
  const prompt = `You are Codex acting as the validator/recovery persona inside ${repoRoot}.

Goal: keep the unattended Rolang Beauty automation safe and moving when the main runner is offline or unhealthy.

Current runner status:
- phase: ${runnerStatus?.phase ?? 'unknown'}
- completed loops: ${Number(runnerStatus?.completedLoops ?? 0)}/${Number(runnerStatus?.maxLoops ?? 0) || 'unknown'}
- last exit code: ${runnerStatus?.lastExitCode ?? 'none'}
- last error: ${runnerStatus?.lastError ?? 'none'}

Current worktree:
\`\`\`text
${dirtyPreview}
\`\`\`

Current validator failures:
${summarizeChecks(validations.failed)}

Rules:
- If validator checks are failing, fix the validator failure first.
- Otherwise make one bounded, durable improvement inside rolang-beauty-theme/.
- Touch at most 2 files.
- Prefer already-dirty files.
- Do not edit generated CSV/report files.
- Do not publish or push Shopify themes.
- Run exact verification commands and include them in your final summary.
- If no safe change is available, create at most one issue draft and explain the blocker.
`;

  const logChunks = [];
  const args = [
    'exec',
    '--ephemeral',
    '--skip-git-repo-check',
    '--dangerously-bypass-approvals-and-sandbox',
    '--color',
    'never',
    '-C',
    repoRoot,
    '-o',
    finalPath,
    '-',
  ];

  if (recoveryCodexModel) {
    args.splice(1, 0, '--model', recoveryCodexModel);
  }

  const child = spawn('codex', args, {
    cwd: repoRoot,
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  child.stdin.write(prompt);
  child.stdin.end();

  child.stdout.on('data', (chunk) => {
    logChunks.push(chunk.toString());
  });

  child.stderr.on('data', (chunk) => {
    logChunks.push(chunk.toString());
  });

  let childExited = false;
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    logChunks.push(`\n[validator] Recovery pass exceeded ${recoveryCodexTimeoutMs}ms and was terminated.\n`);
    child.kill('SIGTERM');

    setTimeout(() => {
      if (!childExited) {
        child.kill('SIGKILL');
      }
    }, 5000);
  }, recoveryCodexTimeoutMs);

  const exitCode = await new Promise((resolve) => {
    child.on('close', (code) => {
      childExited = true;
      resolve(code ?? (timedOut ? 124 : 1));
    });
    child.on('error', (error) => {
      childExited = true;
      logChunks.push(`\n[validator] Failed to start codex: ${error.message}\n`);
      resolve(1);
    });
  });

  clearTimeout(timeout);
  writeFileSync(logPath, logChunks.join(''), 'utf8');

  return {
    exitCode,
    timedOut,
    logPath,
    finalPath,
    finalMessage: readText(finalPath),
    issueSync: runIssueSync(),
  };
}

function runnerIsFinished(runnerStatus) {
  const completedLoops = Number(runnerStatus?.completedLoops ?? 0);
  const maxLoops = Number(runnerStatus?.maxLoops ?? 0);
  return runnerStatus?.phase === 'completed' || (maxLoops > 0 && completedLoops >= maxLoops);
}

function runnerStoppedForDirtyThreshold(runnerStatus) {
  return String(runnerStatus?.lastError ?? '').includes('dirty path count reached');
}

function restartRunner() {
  const kickstartResult = runResult('launchctl', ['kickstart', '-k', runnerLabel]);
  if (kickstartResult.ok) {
    return kickstartResult;
  }

  if (!existsSync(runnerPlistPath)) {
    return kickstartResult;
  }

  const bootstrapResult = runResult('launchctl', ['bootstrap', `gui/${uid}`, runnerPlistPath]);
  if (bootstrapResult.ok) {
    return bootstrapResult;
  }

  return {
    ok: false,
    code: bootstrapResult.code || kickstartResult.code,
    output: [kickstartResult.output, bootstrapResult.output].filter(Boolean).join('\n'),
  };
}

async function main() {
  ensureStateDirs();
  claimValidatorLock();

  const previousValidatorStatus = readJson(validatorStatusPath) ?? {};
  const runnerStatus = readJson(runnerStatusPath) ?? {};
  const dirtyStatusLines = listDirtyStatusLines();
  const dirtyFiles = listDirtyFiles(dirtyStatusLines);
  const validations = validateWorktree(dirtyFiles);
  const runnerPid = Number(runnerStatus?.pid ?? 0);
  const runnerAlive = isProcessAlive(runnerPid);
  const lastHeartbeatAt = Date.parse(runnerStatus?.lastHeartbeatAt ?? '');
  const runnerStale =
    !runnerAlive ||
    !Number.isFinite(lastHeartbeatAt) ||
    Date.now() - lastHeartbeatAt > staleMs;

  writeFileSync(
    directivePath,
    buildDirective({
      dirtyFiles,
      validations,
      runnerStatus,
      runnerAlive,
      runnerStale,
    }),
    'utf8',
  );

  const validatorStatus = {
    pid: process.pid,
    startedAt: previousValidatorStatus.startedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastRunAt: new Date().toISOString(),
    intervalMs,
    staleMs,
    recoveryCooldownMs,
    maxRecoveries,
    recoveryDirtyPathThreshold,
    runner: {
      pid: runnerPid || null,
      alive: runnerAlive,
      stale: runnerStale,
      phase: runnerStatus?.phase ?? 'unknown',
      completedLoops: Number(runnerStatus?.completedLoops ?? 0),
      maxLoops: Number(runnerStatus?.maxLoops ?? 0),
      lastExitCode: runnerStatus?.lastExitCode ?? null,
      lastError: runnerStatus?.lastError ?? null,
    },
    dirtyPathCount: dirtyFiles.length,
    dirtyPaths: dirtyFiles.slice(0, 12),
    validations: {
      passed: validations.passed,
      failedChecks: validations.failed.map((check) => check.name),
    },
    directivePath,
    lastAction: 'updated-directive',
    lastActionDetails: 'Steering prompt refreshed from current worktree and runner state.',
    recoveryCount: previousValidatorStatus.recoveryCount ?? 0,
  };

  const issueSyncResult = runIssueSync();
  validatorStatus.lastIssueSync = issueSyncResult.output || null;

  if (runnerIsFinished(runnerStatus)) {
    validatorStatus.lastAction = 'monitor-only';
    validatorStatus.lastActionDetails = 'Main runner already completed its bounded loop cap.';
  } else if (runnerStoppedForDirtyThreshold(runnerStatus)) {
    validatorStatus.lastAction = 'held-for-review';
    validatorStatus.lastActionDetails =
      'Main runner stopped on dirty-path safety threshold. Validator updated steering and did not auto-restart.';
  } else if (runnerAlive && !runnerStale) {
    validatorStatus.lastAction = validations.passed ? 'monitor-only' : 'steered-active-runner';
    validatorStatus.lastActionDetails = validations.passed
      ? 'Main runner healthy and validators passing.'
      : 'Main runner healthy but validator checks are failing; steering updated for the next iteration.';
  } else if (!validations.passed && shouldAttemptRecovery(previousValidatorStatus, dirtyFiles, runnerStatus)) {
    const recoveryResult = await runRecoveryCodex({
      runnerStatus,
      dirtyStatusLines,
      validations,
    });

    validatorStatus.lastRecoveryAt = new Date().toISOString();
    validatorStatus.lastRecoveryExitCode = recoveryResult.exitCode;
    validatorStatus.lastRecoveryLog = recoveryResult.logPath;
    validatorStatus.lastRecoveryFinal = recoveryResult.finalPath;
    validatorStatus.lastRecoveryMessage = recoveryResult.finalMessage || null;
    validatorStatus.recoveryCount = (previousValidatorStatus.recoveryCount ?? 0) + 1;
    validatorStatus.lastAction = 'ran-recovery-codex';
    validatorStatus.lastActionDetails =
      recoveryResult.exitCode === 0
        ? 'Recovery Codex pass completed while the main runner was unhealthy.'
        : `Recovery Codex pass exited with code ${recoveryResult.exitCode}.`;

    appendEvent(`recovery exit=${recoveryResult.exitCode}`);

    const postRecoveryDirtyLines = listDirtyStatusLines();
    const postRecoveryDirtyFiles = listDirtyFiles(postRecoveryDirtyLines);
    const postRecoveryValidations = validateWorktree(postRecoveryDirtyFiles);
    validatorStatus.validations = {
      passed: postRecoveryValidations.passed,
      failedChecks: postRecoveryValidations.failed.map((check) => check.name),
    };
    validatorStatus.dirtyPathCount = postRecoveryDirtyFiles.length;
    validatorStatus.dirtyPaths = postRecoveryDirtyFiles.slice(0, 12);
    validatorStatus.lastIssueSync = recoveryResult.issueSync.output || validatorStatus.lastIssueSync;

    if (postRecoveryValidations.passed && postRecoveryDirtyFiles.length <= recoveryDirtyPathThreshold) {
      const restartResult = restartRunner();
      validatorStatus.lastRestartAt = new Date().toISOString();
      validatorStatus.lastRestartResult = restartResult.output || null;
      if (restartResult.ok) {
        validatorStatus.lastActionDetails += ' Runner restart requested after successful recovery validation.';
        appendEvent('runner restarted after recovery');
      }
    }
  } else if (!validations.passed) {
    validatorStatus.lastAction = 'held-unhealthy';
    validatorStatus.lastActionDetails =
      'Validator checks are failing, but recovery is paused by cooldown, dirty-path threshold, or recovery cap.';
  } else {
    const restartResult = restartRunner();
    validatorStatus.lastRestartAt = new Date().toISOString();
    validatorStatus.lastRestartResult = restartResult.output || null;
    validatorStatus.lastAction = restartResult.ok ? 'restarted-runner' : 'runner-restart-failed';
    validatorStatus.lastActionDetails = restartResult.ok
      ? 'Main runner was unhealthy and has been asked to restart.'
      : 'Main runner was unhealthy and restart failed. Steering remains in place for the next validator run.';
    appendEvent(restartResult.ok ? 'runner restart requested' : 'runner restart failed');

    if (!restartResult.ok && shouldAttemptRecovery(previousValidatorStatus, dirtyFiles, runnerStatus)) {
      const recoveryResult = await runRecoveryCodex({
        runnerStatus,
        dirtyStatusLines,
        validations,
      });
      validatorStatus.lastRecoveryAt = new Date().toISOString();
      validatorStatus.lastRecoveryExitCode = recoveryResult.exitCode;
      validatorStatus.lastRecoveryLog = recoveryResult.logPath;
      validatorStatus.lastRecoveryFinal = recoveryResult.finalPath;
      validatorStatus.lastRecoveryMessage = recoveryResult.finalMessage || null;
      validatorStatus.recoveryCount = (previousValidatorStatus.recoveryCount ?? 0) + 1;
      validatorStatus.lastAction = 'runner-restart-failed-recovery-ran';
      validatorStatus.lastActionDetails += ` Recovery exit code: ${recoveryResult.exitCode}.`;
      validatorStatus.lastIssueSync = recoveryResult.issueSync.output || validatorStatus.lastIssueSync;
      appendEvent(`restart failed, recovery exit=${recoveryResult.exitCode}`);
    }
  }

  appendEvent(`validator action=${validatorStatus.lastAction} dirty=${validatorStatus.dirtyPathCount} runnerAlive=${runnerAlive} validations=${validatorStatus.validations.passed ? 'pass' : 'fail'}`);
  writeJson(validatorStatusPath, validatorStatus);
}

main()
  .catch((error) => {
    writeJson(validatorStatusPath, {
      pid: process.pid,
      updatedAt: new Date().toISOString(),
      lastRunAt: new Date().toISOString(),
      lastAction: 'validator-failed',
      lastActionDetails: error instanceof Error ? error.stack ?? error.message : String(error),
    });
    appendEvent(`validator failed: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    cleanupValidatorLock();
  });
