import { spawn } from 'node:child_process';
import type { WebContents } from 'electron';
import { IPC } from '../../shared/ipc-contract';

export async function spawnStream(cmdline: string, sender: WebContents, streamId: string): Promise<number> {
  sender.send(IPC.ModuleLogEvent, { streamId, event: 'cmd', cmd: cmdline });
  return await new Promise<number>((resolve) => {
    const child = spawn(cmdline, { shell: true, windowsHide: true });
    child.stdout?.on('data', (buf) => {
      sender.send(IPC.ModuleLogEvent, { streamId, event: 'stdout', chunk: String(buf) });
    });
    child.stderr?.on('data', (buf) => {
      sender.send(IPC.ModuleLogEvent, { streamId, event: 'stderr', chunk: String(buf) });
    });
    child.on('close', (code) => {
      sender.send(IPC.ModuleLogEvent, { streamId, event: 'end', code });
      resolve(typeof code === 'number' ? code : -1);
    });
    child.on('error', (err) => {
      sender.send(IPC.ModuleLogEvent, { streamId, event: 'error', message: String(err?.message || err) });
    });
  });
}
