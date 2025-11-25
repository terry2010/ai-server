import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked = false, onCheckedChange, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 items-center rounded-full border border-white/40 bg-white/60 px-0.5 transition-colors duration-150',
          checked ? 'bg-primary/90' : 'bg-slate-300/80',
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-150',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
    )
  },
)

Switch.displayName = 'Switch'
