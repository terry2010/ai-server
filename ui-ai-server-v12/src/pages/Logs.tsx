import { useMemo, useState } from 'react'
import { Filter, RefreshCcw, Trash2 } from 'lucide-react'
import { GlassCard } from '@/components/GlassCard'
import { Button } from '@/components/ui/button'
import { StatusDot } from '@/components/StatusDot'

export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

export interface LogItem {
  id: number
  timestamp: string
  level: LogLevel
  module: 'client' | 'n8n' | 'dify' | 'oneapi' | 'ragflow'
  service: string
  message: string
}

const mockLogs: LogItem[] = [
  {
    id: 1,
    timestamp: '2025-09-16 19:22:10',
    level: 'info',
    module: 'client',
    service: 'ui-shell',
    message: '应用启动完成，用时 1324ms。',
  },
  {
    id: 2,
    timestamp: '2025-09-16 19:22:12',
    level: 'info',
    module: 'n8n',
    service: 'container-n8n',
    message: '容器启动，监听端口 5678。',
  },
  {
    id: 3,
    timestamp: '2025-09-16 19:22:20',
    level: 'warn',
    module: 'dify',
    service: 'container-dify',
    message: '检测到本地端口 8081 已被占用，尝试使用 8082。',
  },
  {
    id: 4,
    timestamp: '2025-09-16 19:22:35',
    level: 'error',
    module: 'ragflow',
    service: 'container-ragflow',
    message: '数据库连接失败，请检查 RAG_FLOW_DB_URL 配置。',
  },
  {
    id: 5,
    timestamp: '2025-09-16 19:23:01',
    level: 'debug',
    module: 'oneapi',
    service: 'container-oneapi',
    message: '下游模型服务健康检查通过，延迟 132ms。',
  },
]

const levelColors: Record<LogLevel, string> = {
  error: 'bg-red-500 text-white',
  warn: 'bg-amber-400 text-slate-900',
  info: 'bg-sky-500 text-white',
  debug: 'bg-slate-600 text-slate-50',
}

export function LogsPage() {
  const [moduleFilter, setModuleFilter] = useState<'all' | LogItem['module']>('all')
  const [levelFilter, setLevelFilter] = useState<'all' | LogLevel>('all')

  const filteredLogs = useMemo(
    () =>
      mockLogs.filter((log) => {
        if (moduleFilter !== 'all' && log.module !== moduleFilter) return false
        if (levelFilter !== 'all' && log.level !== levelFilter) return false
        return true
      }),
    [moduleFilter, levelFilter],
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">系统日志</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
            <StatusDot status="running" />
            <span>实时</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-white/90 px-2 py-1 text-slate-700 shadow-sm dark:bg-slate-900/70 dark:text-slate-100">
            <Filter className="mr-1 h-3 w-3 text-slate-500 dark:text-slate-400" />
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value as any)}
              className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-slate-800 shadow-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="all">全部模块</option>
              <option value="client">client</option>
              <option value="n8n">n8n</option>
              <option value="dify">Dify</option>
              <option value="oneapi">OneAPI</option>
              <option value="ragflow">RagFlow</option>
            </select>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as any)}
              className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-slate-800 shadow-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="all">全部级别</option>
              <option value="error">error</option>
              <option value="warn">warn</option>
              <option value="info">info</option>
              <option value="debug">debug</option>
            </select>
          </div>
          <Button size="sm" variant="outline" shine className="text-[11px]">
            <RefreshCcw className="mr-1 h-3 w-3" /> 刷新
          </Button>
          <Button size="sm" variant="destructive" shine className="text-[11px]">
            <Trash2 className="mr-1 h-3 w-3" /> 清空
          </Button>
        </div>
      </div>

      <GlassCard className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-0 text-slate-800 dark:border-white/20 dark:bg-slate-950/80">
        <div className="grid grid-cols-[160px_70px_80px_minmax(0,1fr)] border-b border-slate-200 bg-slate-100 px-4 py-2 text-[11px] font-medium text-slate-700 dark:border-slate-800/80 dark:bg-slate-900/90 dark:text-slate-300">
          <div>时间</div>
          <div>级别</div>
          <div>模块 / 服务</div>
          <div>消息</div>
        </div>
        <div className="max-h-80 overflow-auto font-mono text-[11px] text-slate-800 dark:text-slate-100">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="grid grid-cols-[160px_70px_80px_minmax(0,1fr)] items-center border-b border-slate-200/70 px-4 py-1.5 hover:bg-slate-50 dark:border-slate-800/50 dark:hover:bg-slate-900/70"
            >
              <div className="tabular-nums text-slate-500 dark:text-slate-400">{log.timestamp}</div>
              <div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-[1px] text-[10px] font-semibold ${levelColors[log.level]}`}
                >
                  {log.level.toUpperCase()}
                </span>
              </div>
              <div className="text-slate-700 dark:text-slate-300">
                {log.module}
                <span className="text-slate-500">/{log.service}</span>
              </div>
              <div className="truncate text-slate-800 dark:text-slate-100">{log.message}</div>
            </div>
          ))}
          {filteredLogs.length === 0 && (
            <div className="px-4 py-6 text-center text-slate-500">当前筛选条件下暂无日志。</div>
          )}
        </div>
      </GlassCard>
    </div>
  )
}
