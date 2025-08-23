import { exec } from 'node:child_process';
import { promisify } from 'node:util';

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
