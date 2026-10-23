/**
 * TabletSplitView - Layout split 70/30 pour tablette landscape
 * Vue quasi-régie pour supervision
 */

import React from 'react'
import { cn } from '../../lib/utils'

interface TabletSplitViewProps {
  main: React.ReactNode
  sidebar: React.ReactNode
  className?: string
}

const TabletSplitView: React.FC<TabletSplitViewProps> = ({
  main,
  sidebar,
  className,
}) => {
  return (
    <div 
      className={cn('flex h-full overflow-hidden', className)}
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      {/* Main - 70% */}
      <div 
        className="flex-1 overflow-y-auto border-r"
        style={{ 
          width: '70%',
          backgroundColor: 'var(--bg)',
          borderColor: 'var(--card-border)',
        }}
      >
        {main}
      </div>
      {/* Sidebar - 30% */}
      <div 
        className="flex-shrink-0 overflow-y-auto"
        style={{ 
          width: '30%',
          backgroundColor: 'var(--card-bg-solid)',
          borderLeft: '1px solid var(--card-border)',
        }}
      >
        {sidebar}
      </div>
    </div>
  )
}

export default TabletSplitView