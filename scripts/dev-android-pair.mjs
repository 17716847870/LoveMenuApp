import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const repoRoot = new URL('..', import.meta.url).pathname;
const emulatorPath = join(homedir(), 'Library/Android/sdk/emulator/emulator');
const adbPath = join(homedir(), 'Library/Android/sdk/platform-tools/adb');
const avdName = process.env.LOVEMENU_AVD ?? 'Pixel_7';
const serverPort = process.env.PORT ?? readServerEnvValue('PORT') ?? '3000';
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? `http://10.0.2.2:${serverPort}/api`;
const children = new Set();

function readServerEnvValue(key) {
  const envPath = join(repoRoot, 'apps/server/.env');
  if (!existsSync(envPath)) {
    return null;
  }

  const match = readFileSync(envPath, 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match?.[1]?.trim().replace(/^["']|["']$/g, '') || null;
}

function log(scope, message) {
  console.log(`[${scope}] ${message}`);
}

function spawnManaged(scope, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...options.env,
    },
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
  });

  children.add(child);

  child.stdout?.on('data', (chunk) => {
    process.stdout.write(`[${scope}] ${chunk}`);
  });
  child.stderr?.on('data', (chunk) => {
    process.stderr.write(`[${scope}] ${chunk}`);
  });
  child.on('exit', (code, signal) => {
    children.delete(child);
    if (!shuttingDown) {
      log(scope, `exited with ${signal ?? code}`);
    }
  });

  return child;
}

function execOutput(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function listBootedDevices() {
  const { stdout } = await execOutput(adbPath, ['devices']);
  return stdout
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter(([serial, status]) => serial?.startsWith('emulator-') && status === 'device')
    .map(([serial]) => serial);
}

async function waitForTwoDevices(timeoutMs = 120_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const devices = await listBootedDevices();
    if (devices.length >= 2) {
      return devices.slice(0, 2);
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  return listBootedDevices();
}

function startEmulators(existingDevices) {
  if (!existsSync(emulatorPath)) {
    log('android', `emulator not found at ${emulatorPath}`);
    return;
  }

  if (existingDevices.length >= 2) {
    log('android', `found two running emulators: ${existingDevices.join(', ')}`);
    return;
  }

  if (existingDevices.length === 1) {
    log(
      'android',
      `found one running emulator (${existingDevices[0]}). Close it first, then rerun pnpm dev:android:pair so both instances can start with -read-only.`,
    );
    process.exit(1);
  }

  log('android', `starting ${avdName} as publisher emulator in read-only mode`);
  spawnManaged('publisher-avd', emulatorPath, ['-avd', avdName, '-read-only', '-no-snapshot-save']);

  log('android', `starting ${avdName} as consumer emulator in read-only mode`);
  spawnManaged('consumer-avd', emulatorPath, ['-avd', avdName, '-read-only', '-no-snapshot-save']);
}

function startDevServers() {
  log('server', `starting Nest backend on http://localhost:${serverPort}/api`);
  spawnManaged('server', 'pnpm', ['--filter', 'server', 'start:dev']);

  log('mobile', `starting Expo with EXPO_PUBLIC_API_BASE_URL=${apiBaseUrl}`);
  spawnManaged('expo', 'pnpm', ['--filter', 'lovemenu-mobile', 'start'], {
    env: {
      EXPO_PUBLIC_API_BASE_URL: apiBaseUrl,
      EXPO_NO_TELEMETRY: '1',
    },
    stdio: 'inherit',
  });
}

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  log('dev', 'stopping child processes...');
  for (const child of children) {
    child.kill('SIGINT');
  }

  setTimeout(() => process.exit(0), 1500).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

if (!existsSync(adbPath)) {
  throw new Error(`adb not found at ${adbPath}`);
}

const existingDevices = await listBootedDevices();
startEmulators(existingDevices);
startDevServers();

log('android', 'waiting for emulator devices while Metro starts...');
const devices = await waitForTwoDevices();

if (devices.length < 2) {
  log('android', `only found ${devices.length} emulator(s). Expo will still start; open another emulator if needed.`);
} else {
  log('android', `publisher emulator: ${devices[0]} login phone 13800138000`);
  log('android', `consumer emulator: ${devices[1]} login phone 13900139000`);
  log('android', 'Expo will keep Metro running. Open Expo Go in each emulator and use the displayed exp:// URL.');
}

await new Promise(() => {});
