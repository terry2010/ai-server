import { pickComposeCommand, run } from './utils';
import type { WebContents } from 'electron';
import { spawnStream } from './log-stream';

export interface ComposeResult { ok: boolean; message?: string; code?: string }

export async function composeUp(file: string, services: string[]): Promise<ComposeResult> {
  const compose = await pickComposeCommand();
  if (!compose) return { ok: false, code: 'E_COMPOSE_NOT_FOUND', message: '未检测到 docker compose/docker-compose' };
  const cmd = `${compose} -f ${file} up -d --no-recreate ${services.join(' ')}`;
  try {
    await run(cmd);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, code: 'E_RUNTIME', message: String(e?.message ?? e) };
  }
}

export async function composeStop(file: string, services: string[]): Promise<ComposeResult> {
  const compose = await pickComposeCommand();
  if (!compose) return { ok: false, code: 'E_COMPOSE_NOT_FOUND', message: '未检测到 docker compose/docker-compose' };
  const cmd = `${compose} -f ${file} stop ${services.join(' ')}`;
  try {
    await run(cmd);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, code: 'E_RUNTIME', message: String(e?.message ?? e) };
  }
}

// ===== Streaming variants =====
export async function composeUpStream(file: string, services: string[], sender: WebContents, streamId: string): Promise<ComposeResult> {
  const compose = await pickComposeCommand();
  if (!compose) return { ok: false, code: 'E_COMPOSE_NOT_FOUND', message: '未检测到 docker compose/docker-compose' };
  const cmd = `${compose} -f ${file} up -d --no-recreate ${services.join(' ')}`;
  try {
    await spawnStream(cmd, sender, streamId);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, code: 'E_RUNTIME', message: String(e?.message ?? e) };
  }
}

export async function composeStopStream(file: string, services: string[], sender: WebContents, streamId: string): Promise<ComposeResult> {
  const compose = await pickComposeCommand();
  if (!compose) return { ok: false, code: 'E_COMPOSE_NOT_FOUND', message: '未检测到 docker compose/docker-compose' };
  const cmd = `${compose} -f ${file} stop ${services.join(' ')}`;
  try {
    await spawnStream(cmd, sender, streamId);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, code: 'E_RUNTIME', message: String(e?.message ?? e) };
  }
}

export async function startContainerStream(containerName: string, sender: WebContents, streamId: string): Promise<ComposeResult> {
  const cmd = `docker start ${containerName}`;
  try {
    await spawnStream(cmd, sender, streamId);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, code: 'E_RUNTIME', message: String(e?.message ?? e) };
  }
}
