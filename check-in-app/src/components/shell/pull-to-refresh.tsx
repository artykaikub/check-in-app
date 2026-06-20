'use client'

import { LoaderCircle } from 'lucide-react'
import { useRef, useState } from 'react'

const THRESHOLD = 70
const MAX_PULL = 110
const RESISTANCE = 0.5

/**
 * Touch pull-to-refresh wrapper. It *is* the scrollable region (so `className` /
 * `style` from the caller are applied to the scroller). When the user drags down
 * from the top, it reveals a spinner and, past the threshold, awaits `onRefresh`.
 */
export function PullToRefresh({
  children,
  onRefresh,
  className,
  style
}: {
  children: React.ReactNode
  onRefresh: () => Promise<unknown>
  className?: string
  style?: React.CSSProperties
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const startY = useRef<number | null>(null)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const onTouchStart = (e: React.TouchEvent) => {
    if (refreshing) return
    const el = scrollerRef.current
    if (el && el.scrollTop <= 0) {
      startY.current = e.touches[0].clientY
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current == null || refreshing) return
    const dy = e.touches[0].clientY - startY.current
    const el = scrollerRef.current
    if (dy > 0 && el && el.scrollTop <= 0) {
      setPull(Math.min(dy * RESISTANCE, MAX_PULL))
    } else {
      startY.current = null
      setPull(0)
    }
  }

  const onTouchEnd = async () => {
    if (startY.current == null) return
    startY.current = null
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true)
      setPull(THRESHOLD)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
        setPull(0)
      }
    } else {
      setPull(0)
    }
  }

  const active = refreshing || pull > 0
  const indicatorOpacity = refreshing ? 1 : Math.min(pull / THRESHOLD, 1)

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* refresh indicator, revealed as the content is pulled down */}
      <div
        className="pointer-events-none absolute left-0 right-0 flex items-center justify-center"
        style={{
          top: 0,
          height: Math.max(pull, refreshing ? THRESHOLD : 0),
          opacity: indicatorOpacity,
          zIndex: 1,
          transition: active ? undefined : 'height .2s ease, opacity .2s ease'
        }}
      >
        <LoaderCircle
          size={22}
          style={{
            color: 'var(--trinity-primary)',
            transform: refreshing ? undefined : `rotate(${pull * 3}deg)`,
            animation: refreshing ? 'rm-spin .8s linear infinite' : undefined
          }}
        />
      </div>

      <div
        ref={scrollerRef}
        className={className}
        style={{
          ...style,
          height: '100%',
          overflowY: 'auto',
          overscrollBehaviorY: 'contain',
          transform: pull > 0 ? `translateY(${pull}px)` : undefined,
          transition: active ? undefined : 'transform .2s ease'
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}
