export function containerNameFor(name: string) {
  // 约定 compose 中 container_name 为 ai-<name>
  return `ai-${name}`;
}

export function serviceNameFor(name: string) {
  // 与 compose 服务名保持一致：basic 与 feature 默认同名
  return name;
}
