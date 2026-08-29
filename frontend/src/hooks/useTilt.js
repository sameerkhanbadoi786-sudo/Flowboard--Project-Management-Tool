import { useRef, useCallback } from 'react'

// Attaches a cursor-tracking 3D tilt to any element. Spread the returned
// props onto the element you want to tilt — it rotates toward the cursor
// and lifts slightly, then springs back flat on mouse leave.
export function useTilt({ max = 10, lift = 10, scale = 1.02 } = {}) {
  const ref = useRef(null)

  const onMouseMove = useCallback((e) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width // 0..1
    const py = (e.clientY - rect.top) / rect.height // 0..1
    const rotateY = (px - 0.5) * max * 2
    const rotateX = (0.5 - py) * max * 2
    el.style.transform =
      `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${lift}px) scale(${scale})`
  }, [max, lift, scale])

  const onMouseLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) translateZ(0) scale(1)'
  }, [])

  return { ref, onMouseMove, onMouseLeave }
}
