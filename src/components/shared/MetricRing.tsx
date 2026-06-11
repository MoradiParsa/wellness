import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  color?: string
  trackClassName?: string
  children?: ReactNode
  className?: string
}

export function MetricRing({
  value,
  max,
  size = 120,
  strokeWidth = 10,
  color = 'hsl(var(--primary))',
  trackClassName = 'text-secondary',
  children,
  className,
}: Props) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const offset = circumference * (1 - ratio)

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={cn('stroke-current', trackClassName)}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  )
}
