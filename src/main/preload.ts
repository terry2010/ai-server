import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  invoke: (channel: string, payload?: any) => ipcRenderer.invoke(channel, payload),
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => ipcRenderer.on(channel, listener),
  off: (channel: string, listener: (event: any, ...args: any[]) => void) => ipcRenderer.off(channel, listener)
});

export {};
