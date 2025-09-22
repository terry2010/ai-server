#!/usr/bin/env node
/*
 * Robust Electron launcher for dev across PowerShell / CMD / Git Bash
 * - Waits for Vite dev server (5174)
 * - Spawns `electron .` with proper env
 */
const waitOn = require('wait-on');
const { spawn } = require('child_process');

const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5174';

(async () => {
  try {
    await new Promise((resolve, reject) => {
      waitOn({ resources: [DEV_URL], timeout: 60_000 }, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    const env = {
      ...process.env,
      ELECTRON_START_URL: '1',
      VITE_DEV_SERVER_URL: DEV_URL,
      NODE_ENV: 'development',
    };

    const child = spawn('electron', ['.', '--trace-warnings'], {
      stdio: 'inherit',
      shell: true, // important for Git Bash / PowerShell command resolution
      env,
    });

    child.on('exit', (code) => process.exit(code ?? 0));
    child.on('error', (e) => {
      console.error('[dev:electron] spawn error:', e);
      process.exit(1);
    });
  } catch (e) {
    console.error('[dev:electron] failed before spawn:', e);
    process.exit(1);
  }
})();
