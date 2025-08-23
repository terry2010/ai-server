import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadRegistry, getGlobalConfig } from '../config/store';
import * as os from 'node:os';
import yaml from 'js-yaml';

export type TemplateResult =
  | { ok: true; path: string }
  | { ok: false; code: 'E_TEMPLATE_MISSING' | 'E_RUNTIME' | 'E_VAR_MISSING'; message: string };

function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

// 目前最小实现：仅解析 feature compose 文件路径并规范化，后续可扩展变量与 fragment 合并
export function getFeatureComposePath(name: string): TemplateResult {
  const modDir = path.join(process.cwd(), 'orchestration', 'modules', name);
  const defPath = path.join(modDir, 'docker-compose.feature.yml');
  if (fs.existsSync(defPath)) {
    return { ok: true, path: toPosix(defPath) };
  }
  // fallback: registry 的 compose.templateRef
  try {
    const reg = loadRegistry();
    const m = reg.byName?.[name];
    const ref = m?.compose?.templateRef;
    if (ref) {
      const candidate = path.isAbsolute(ref) ? ref : path.join(modDir, ref);
      if (fs.existsSync(candidate)) return { ok: true, path: toPosix(candidate) };
      return { ok: false, code: 'E_TEMPLATE_MISSING', message: `模板缺失: ${candidate}` };
    }
  } catch {}
  return { ok: false, code: 'E_TEMPLATE_MISSING', message: `模板缺失: ${defPath}` };
}
export function renderComposeTemplate(_name: string, _vars: Record<string, any>) {
  // return yaml string
  return '# TODO: compose template\n';
}

// 解析形如 ${VAR:default} 的默认值，或返回 fallback
export function resolveDefaultVar(expr: string, fallback?: string): string | undefined {
  if (!expr) return fallback;
  const m = expr.match(/^\$\{[^:}]+:([^}]+)}/);
  if (m && m[1]) return m[1];
  if (/^\d+$/.test(expr)) return expr; // 数字
  if (/^\d+\.\d+\.\d+\.\d+$/.test(expr)) return expr; // IPv4
  return fallback;
}

// 将字符串中的多个 ${VAR:default} 占位按默认值替换（不读取环境变量，先满足默认值场景）
export function resolveVarsInString(s?: string): string | undefined {
  if (!s) return s;
  return s.replace(/\$\{[^:}]+:([^}]+)}/g, (_all, dflt) => String(dflt));
}

function isPlainObject(v: any): v is Record<string, any> {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge<T>(a: T, b: any): T {
  if (Array.isArray(a) && Array.isArray(b)) return b as any; // 覆盖数组
  if (isPlainObject(a) && isPlainObject(b)) {
    const out: any = { ...a };
    for (const k of Object.keys(b)) {
      if (k in out) out[k] = deepMerge(out[k], (b as any)[k]);
      else out[k] = (b as any)[k];
    }
    return out;
  }
  return (b !== undefined ? b : a) as any;
}

function replaceVarsInStringWithDict(s: string, dict: Record<string, string>, missing: Set<string>): string {
  return s.replace(/\$\{([A-Za-z0-9_]+)(?::([^}]+))?}/g, (_all, varName: string, dflt?: string) => {
    const key = String(varName);
    const hasVal = Object.prototype.hasOwnProperty.call(dict, key) && dict[key] != null;
    if (hasVal) return String(dict[key]);
    if (dflt !== undefined) return String(dflt);
    missing.add(`
${'${'}${key}}`);
    return '';
  });
}

function walkAndReplace(obj: any, missing: Set<string>, dict?: Record<string, string>): any {
  if (typeof obj === 'string') {
    if (dict) return replaceVarsInStringWithDict(obj, dict, missing);
    // 兼容旧逻辑：仅替换默认值
    const nakedVar = obj.match(/\$\{([A-Za-z0-9_]+)}/g);
    if (nakedVar) for (const m of nakedVar) if (!/:/.test(m)) missing.add(m);
    return resolveVarsInString(obj);
  }
  if (Array.isArray(obj)) return obj.map(v => walkAndReplace(v, missing, dict));
  if (isPlainObject(obj)) {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) out[k] = walkAndReplace(v, missing, dict);
    return out;
  }
  return obj;
}

// 将模板文件进行最小变量替换，产出一个临时 compose 文件路径
export function materializeFeatureCompose(name: string): TemplateResult {
  const base = getFeatureComposePath(name);
  let doc: any = undefined;
  let reg: ReturnType<typeof loadRegistry> | null = null;
  try { reg = loadRegistry(); } catch {}

  if (base.ok) {
    try {
      const raw = fs.readFileSync(base.path, 'utf-8');
      doc = yaml.load(raw) ?? {};
    } catch (e: any) {
      return { ok: false, code: 'E_RUNTIME', message: `解析模板失败: ${e?.message || e}` };
    }
  } else {
    // 尝试 fragment 作为来源
    const frag = reg?.byName?.[name]?.compose?.fragment;
    if (typeof frag === 'string') {
      try {
        doc = yaml.load(frag) ?? {};
      } catch (e: any) {
        return { ok: false, code: 'E_RUNTIME', message: `解析 fragment 失败: ${e?.message || e}` };
      }
    } else if (isPlainObject(frag)) {
      doc = frag;
    } else {
      return base; // 维持原来的 E_TEMPLATE_MISSING
    }
  }

  // 若注册表中存在对象型 fragment，则合并
  const regFrag = reg?.byName?.[name]?.compose?.fragment;
  if (isPlainObject(regFrag)) {
    doc = deepMerge(doc ?? {}, regFrag);
  }

  // 变量替换与缺失变量检测
  const missing = new Set<string>();
  const varsDict: Record<string, string> = {};
  try {
    const mod = reg?.byName?.[name];
    if (mod?.variables) for (const [k, v] of Object.entries(mod.variables)) varsDict[k] = String(v);
    const g = getGlobalConfig();
    for (const [k, v] of Object.entries(g as any)) varsDict[k] = String(v);
    for (const [k, v] of Object.entries(process.env)) if (typeof v === 'string') varsDict[k] = v;
  } catch {}
  const replaced = walkAndReplace(doc, missing, varsDict);
  if (missing.size > 0) {
    return { ok: false, code: 'E_VAR_MISSING', message: `缺失变量默认值: ${Array.from(missing).join(', ')}` };
  }

  try {
    const tmpDir = path.join(os.tmpdir(), 'ai-server');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const out = path.join(tmpDir, `feature-${name}.compose.yml`);
    const text = yaml.dump(replaced, { noRefs: true, lineWidth: 120 });
    fs.writeFileSync(out, text, 'utf-8');
    return { ok: true, path: toPosix(out) };
  } catch (e: any) {
    return { ok: false, code: 'E_RUNTIME', message: String(e?.message ?? e) };
  }
}
