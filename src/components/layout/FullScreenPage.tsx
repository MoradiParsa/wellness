import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, type PanInfo } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  title?: string
  right?: ReactNode
  onBack?: () => void
  children: ReactNode
  footer?: ReactNode
  className?: string
  /** Disable horizontal swipe-back (e.g. screens with horizontal scrolling). */
  noSwipe?: boolean
}

export function FullScreenPage({
  title,
  right,
  onBack,
  children,
  footer,
  className,
  noSwipe,
}: Props) {
  const navigate = useNavigate()
  const back = onBack ?? (() => navigate(-1))

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 110 || info.velocity.x > 700) back()
  }

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 420, damping: 40 }}
      drag={noSwipe ? false : 'x'}
      dragDirectionLock
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 0.7 }}
      onDragEnd={noSwipe ? undefined : handleDragEnd}
      className="fixed inset-0 z-30 mx-auto flex max-w-md flex-col bg-background"
    >
      <header className="safe-top sticky top-0 z-10 glass flex items-center gap-2 border-b border-border/60 px-2 py-2.5">
        <button
          onClick={back}
          className="flex h-10 items-center gap-0.5 rounded-full pl-1 pr-3 text-[15px] font-medium text-foreground tap-scale"
        >
          <ChevronLeft className="size-6" />
          Back
        </button>
        {title && (
          <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-semibold">{title}</h1>
        )}
        <div className="ml-auto pr-1">{right}</div>
      </header>

      <div className={cn('flex-1 overflow-y-auto overscroll-contain px-5 py-4', className)}>
        {children}
      </div>

      {footer && (
        <div className="glass border-t border-border/60 px-5 pb-safe pt-3">{footer}</div>
      )}
    </motion.div>
  )
}
