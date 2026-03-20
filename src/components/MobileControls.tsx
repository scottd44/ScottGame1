import { useEffect, useRef, useState } from 'react'

export interface MobileInput {
  dx: number   // -1 to 1
  dy: number   // -1 to 1
  firing: boolean
  interact: boolean
}

interface Props {
  inputRef: React.MutableRefObject<MobileInput>
  onInteract: () => void
}

const JOYSTICK_RADIUS = 60
const KNOB_RADIUS = 24

export default function MobileControls({ inputRef, onInteract }: Props) {
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 })
  const [fireActive, setFireActive] = useState(false)
  const joystickBase  = useRef<{ x: number; y: number } | null>(null)
  const joystickTouch = useRef<number | null>(null)
  const fireTouch     = useRef<number | null>(null)

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      for (const touch of Array.from(e.changedTouches)) {
        const x = touch.clientX
        const y = touch.clientY
        const isLeftSide = x < window.innerWidth / 2

        if (isLeftSide && joystickTouch.current === null) {
          joystickTouch.current = touch.identifier
          joystickBase.current  = { x, y }
          setKnobOffset({ x: 0, y: 0 })
        }
        if (!isLeftSide && fireTouch.current === null) {
          fireTouch.current = touch.identifier
          inputRef.current.firing = true
          setFireActive(true)
        }
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier === joystickTouch.current && joystickBase.current) {
          const dx = touch.clientX - joystickBase.current.x
          const dy = touch.clientY - joystickBase.current.y
          const dist = Math.hypot(dx, dy)
          const clamped = Math.min(dist, JOYSTICK_RADIUS)
          const angle   = Math.atan2(dy, dx)
          const ox = Math.cos(angle) * clamped
          const oy = Math.sin(angle) * clamped

          setKnobOffset({ x: ox, y: oy })
          inputRef.current.dx = ox / JOYSTICK_RADIUS
          inputRef.current.dy = oy / JOYSTICK_RADIUS
        }
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier === joystickTouch.current) {
          joystickTouch.current  = null
          joystickBase.current   = null
          inputRef.current.dx    = 0
          inputRef.current.dy    = 0
          setKnobOffset({ x: 0, y: 0 })
        }
        if (touch.identifier === fireTouch.current) {
          fireTouch.current      = null
          inputRef.current.firing = false
          setFireActive(false)
        }
      }
    }

    window.addEventListener('touchstart',  onTouchStart, { passive: false })
    window.addEventListener('touchmove',   onTouchMove,  { passive: false })
    window.addEventListener('touchend',    onTouchEnd)
    window.addEventListener('touchcancel', onTouchEnd)

    return () => {
      window.removeEventListener('touchstart',  onTouchStart)
      window.removeEventListener('touchmove',   onTouchMove)
      window.removeEventListener('touchend',    onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [inputRef])

  return (
    <>
      {/* Left: Joystick */}
      <div style={{
        position: 'absolute', bottom: 60, left: 60,
        width: JOYSTICK_RADIUS * 2, height: JOYSTICK_RADIUS * 2,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
        border: '2px solid rgba(255,255,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        touchAction: 'none', userSelect: 'none',
      }}>
        {/* Knob */}
        <div style={{
          width: KNOB_RADIUS * 2, height: KNOB_RADIUS * 2,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.35)',
          border: '2px solid rgba(255,255,255,0.6)',
          position: 'absolute',
          transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
          transition: knobOffset.x === 0 && knobOffset.y === 0 ? 'transform 0.1s' : 'none',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Right: Fire button */}
      <div style={{
        position: 'absolute', bottom: 80, right: 60,
        width: 90, height: 90, borderRadius: '50%',
        background: fireActive ? 'rgba(231,76,60,0.7)' : 'rgba(231,76,60,0.25)',
        border: '3px solid #e74c3c',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace', fontWeight: 'bold', fontSize: 13, color: '#fff',
        touchAction: 'none', userSelect: 'none',
        boxShadow: fireActive ? '0 0 20px rgba(231,76,60,0.6)' : 'none',
        transition: 'all 0.08s',
      }}>
        FIRE
      </div>

      {/* Right: Interact/Loot button */}
      <div
        onTouchStart={(e) => { e.preventDefault(); onInteract() }}
        style={{
          position: 'absolute', bottom: 190, right: 70,
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(46,204,113,0.2)',
          border: '2px solid #2ecc71',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'monospace', fontSize: 11, color: '#2ecc71',
          touchAction: 'none', userSelect: 'none',
        }}>
        LOOT<br />/ HEAL
      </div>
    </>
  )
}
