import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getVisibleTabs, activeTabKey } from './navConfig'
import { useSettings } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { settings } = useSettings()
  const active = activeTabKey(pathname)
  const tabs = getVisibleTabs(settings.bottomBarVisibleKeys)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto max-w-md px-3 pb-safe">
        <div className="glass flex items-stretch justify-around rounded-t-3xl border-t border-border/70">
          {tabs.map((tab) => {
            const isActive = tab.key === active
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => navigate(tab.to)}
                className="relative flex flex-1 flex-col items-center gap-1 py-2.5 pt-3"
              >
                {isActive && (
                  <motion.span
                    layoutId="tab-indicator"
                    transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                    className="absolute top-1 h-1 w-7 rounded-full bg-foreground"
                  />
                )}
                <Icon
                  className={cn(
                    'size-[22px] transition-colors',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                  )}
                  strokeWidth={isActive ? 2.4 : 2}
                />
                <span
                  className={cn(
                    'text-[10px] font-medium transition-colors',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
