export function containerNameFor(name: string) {
  // 约定 compose 中 container_name 为 ai-<name>
  return `ai-${name}`;
}

export function serviceNameFor(name: string) {
  // 与 compose 服务名保持一致：basic 与 feature 默认同名
  // 临时映射：dify 模块的主服务为 dify-api
  if (name === 'dify') return 'dify-api';
  return name;
}

// 返回模块对应的所有服务名（用于 feature 一次性启动/停止多个服务）
export function servicesForModule(name: string): string[] {
  if (name === 'dify') return ['dify-api', 'dify-web'];
  return [serviceNameFor(name)];
}
