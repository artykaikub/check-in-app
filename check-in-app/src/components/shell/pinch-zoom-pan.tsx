'use client'

import { useEffect, useRef } from 'react'

/**
 * Browser-style pinch-to-zoom + pan.
 *
 * Installed PWAs run in `display: standalone`, which makes the OS suppress the
 * browser's native visual-viewport zoom — so the app feels "locked". This
 * component re-creates that gesture in JS: a **two-finger** pinch scales the
 * wrapped tree (origin top-left), and dragging two fingers pans the zoomed view,
 * exactly like pinch-zooming a web page. Pinching back below ~1× snaps to fit.
 *
 * Single-finger touches pass straight through untouched, so normal scrolling,
 * taps, buttons and pull-to-refresh keep working — only multi-touch gestures are
 * intercepted. The transform is written directly to the DOM (no per-frame React
 * render) for smoothness, and overlays portalled *outside* this wrapper (camera,
 * sheets) stay at 1× as you'd expect.
 */
const MAX_SCALE = 5
const RESET_BELOW = 1.02

export function PinchZoomPan({ children }: { children: React.ReactNode }) {
  const clipRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const clip = clipRef.current
    const content = contentRef.current
    if (!clip || !content) return

    // Live transform state (mutated outside React for per-frame smoothness).
    let scale = 1
    let tx = 0
    let ty = 0

    // Per-gesture anchors, captured whenever two fingers go down.
    let pinching = false
    let startDist = 0
    let startScale = 1
    let startTx = 0
    let startTy = 0
    let startMidX = 0
    let startMidY = 0

    const apply = (animate = false) => {
      content.style.transition = animate ? 'transform .2s ease' : 'none'
      content.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`
    }

    // Keep the content edges glued to the viewport edges (no empty gutters).
    const clamp = () => {
      const { width: w, height: h } = clip.getBoundingClientRect()
      tx = Math.min(0, Math.max(w * (1 - scale), tx))
      ty = Math.min(0, Math.max(h * (1 - scale), ty))
    }

    const dist = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)

    // Two-finger midpoint, in container-local coordinates.
    const mid = (t: TouchList) => {
      const r = clip.getBoundingClientRect()
      return {
        x: (t[0].clientX + t[1].clientX) / 2 - r.left,
        y: (t[0].clientY + t[1].clientY) / 2 - r.top
      }
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      pinching = true
      startDist = dist(e.touches)
      startScale = scale
      startTx = tx
      startTy = ty
      const m = mid(e.touches)
      startMidX = m.x
      startMidY = m.y
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!pinching || e.touches.length !== 2) return
      // Block the page from also scrolling/refreshing under the pinch.
      e.preventDefault()

      const factor = dist(e.touches) / startDist
      scale = Math.min(MAX_SCALE, Math.max(1, startScale * factor))

      const m = mid(e.touches)
      // Zoom about the starting focal point, then add the focal pan delta.
      tx = startMidX - (startMidX - startTx) * (scale / startScale) + (m.x - startMidX)
      ty = startMidY - (startMidY - startTy) * (scale / startScale) + (m.y - startMidY)

      clamp()
      apply()
    }

    const endGesture = (e: TouchEvent) => {
      if (e.touches.length >= 2) return
      pinching = false
      if (scale <= RESET_BELOW) {
        scale = 1
        tx = 0
        ty = 0
        apply(true)
      } else {
        clamp()
        apply(true)
      }
    }

    // touchmove must be non-passive so preventDefault() actually works; React's
    // synthetic touch listeners are passive, so bind natively here.
    clip.addEventListener('touchstart', onTouchStart, { passive: false })
    clip.addEventListener('touchmove', onTouchMove, { passive: false })
    clip.addEventListener('touchend', endGesture)
    clip.addEventListener('touchcancel', endGesture)
    return () => {
      clip.removeEventListener('touchstart', onTouchStart)
      clip.removeEventListener('touchmove', onTouchMove)
      clip.removeEventListener('touchend', endGesture)
      clip.removeEventListener('touchcancel', endGesture)
    }
  }, [])

  return (
    <div ref={clipRef} className="h-full w-full overflow-hidden">
      <div
        ref={contentRef}
        className="h-full w-full"
        style={{ transformOrigin: '0 0', willChange: 'transform' }}
      >
        {children}
      </div>
    </div>
  )
}
