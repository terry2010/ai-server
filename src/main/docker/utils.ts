import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as net from 'node:net';
import * as http from 'node:http';
import * as https from 'node:https';

const execAsync = promisify(exec);

export async function commandExists(cmd: string) {
  try {
    await execAsync(`${cmd} --version`, { timeout: 5000, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

export async function pickComposeCommand(): Promise<'docker compose' | 'docker-compose' | null> {
  if (await commandExists('docker compose')) return 'docker compose';
  if (await commandExists('docker-compose')) return 'docker-compose';
  return null;
}

export async function dockerRunning(): Promise<boolean> {
  try {
    await execAsync('docker info', { timeout: 8000, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

export async function dockerVersion(): Promise<string | undefined> {
  try {
    const { stdout } = await execAsync('docker --version', { timeout: 5000, windowsHide: true });
    return stdout?.trim();
  } catch {
    return undefined;
  }
}

export async function run(cmd: string, cwd?: string) {
  const { stdout, stderr } = await execAsync(cmd, { timeout: 60_000, windowsHide: true, cwd });
  return { stdout, stderr };
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function isTcpOpen(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const onResult = (result: boolean) => {
      if (done) return; done = true;
      try { socket.destroy(); } catch {}
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => onResult(true));
    socket.once('timeout', () => onResult(false));
    socket.once('error', () => onResult(false));
    socket.connect(port, host);
  });
}

export async function waitForTcp(host: string, port: number, retries = 20, intervalMs = 2000, timeoutPerTryMs = 2000) {
  for (let i = 0; i < retries; i++) {
    if (await isTcpOpen(host, port, timeoutPerTryMs)) return true;
    await sleep(intervalMs);
  }
  return false;
}

export async function waitForHttpOk(url: string, retries = 30, intervalMs = 2000, timeoutPerTryMs = 5000) {
  const client = url.startsWith('https') ? https : http;
  const doReq = () => new Promise<boolean>((resolve) => {
    const req = client.get(url, { timeout: timeoutPerTryMs }, (res) => {
      // 2xx 认为可用
      resolve(res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300);
      res.resume();
    });
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.on('error', () => resolve(false));
  });
  for (let i = 0; i < retries; i++) {
    const ok = await doReq();
    if (ok) return true;
    await sleep(intervalMs);
  }
  return false;
}
