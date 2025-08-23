import * as fs from 'node:fs';
import yaml from 'js-yaml';
import { materializeFeatureCompose, getFeatureComposePath } from './template';

export function containerNameFor(name: string) {
  // 约定 compose 中 container_name 为 ai-<name>
  return `ai-${name}`;
}

export function serviceNameFor(name: string) {
  // 与 compose 服务名保持一致：basic 与 feature 默认同名
  return name;
}

// 返回模块对应的所有服务名（用于 feature 一次性启动/停止多个服务）
export function servicesForModule(name: string): string[] {
  // 尝试从“物化后的 feature compose”解析 services 列表
  try {
    const tpl = materializeFeatureCompose(name);
    if (tpl.ok) {
      const raw = fs.readFileSync(tpl.path, 'utf-8');
      const doc: any = yaml.load(raw) ?? {};
      const svcs = doc && doc.services && typeof doc.services === 'object' ? Object.keys(doc.services) : [];
      if (svcs.length > 0) return svcs;
    } else {
      // 回退：直接读取未物化模板
      const base = getFeatureComposePath(name);
      if (base.ok) {
        const raw = fs.readFileSync(base.path, 'utf-8');
        const doc: any = yaml.load(raw) ?? {};
        const svcs = doc && doc.services && typeof doc.services === 'object' ? Object.keys(doc.services) : [];
        if (svcs.length > 0) return svcs;
      }
    }
  } catch {}
  // 最后回退：按旧逻辑仅返回与模块同名的服务
  return [serviceNameFor(name)];
}
