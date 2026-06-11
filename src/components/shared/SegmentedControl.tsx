import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  size?: 'sm' | 'default'
  layoutId?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'default',
  layoutId = 'segmented',
}: Props<T>) {
  return (
    <div
      className={cn(
        'relative flex w-full items-center gap-1 rounded-full bg-secondary p-1',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative z-10 flex-1 rounded-full text-center font-medium transition-colors',
              size === 'sm' ? 'py-1.5 text-[13px]' : 'py-2 text-sm',
              active ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                className="absolute inset-0 -z-10 rounded-full bg-background shadow-sm"
              />
            )}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
