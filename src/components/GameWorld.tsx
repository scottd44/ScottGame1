import { useEffect, useRef } from 'react'
import { useMultiplayer } from '../hooks/useMultiplayer'
import type { Player } from '../hooks/useMultiplayer'

const PLAYER_RADIUS = 20
const PLAYER_SPEED_LABEL_OFFSET = 30

function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, isLocal: boolean) {
  const { x, y, color } = player

  // Glow for local player
  if (isLocal) {
    ctx.shadowColor = color
    ctx.shadowBlur = 18
  }

  // Circle body
  ctx.beginPath()
  ctx.arc(x, y, PLAYER_RADIUS, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()

  // White border
  ctx.lineWidth = isLocal ? 3 : 1.5
  ctx.strokeStyle = isLocal ? '#ffffff' : 'rgba(255,255,255,0.4)'
  ctx.stroke()

  ctx.shadowBlur = 0

  // "You" label for local player
  ctx.fillStyle = '#ffffff'
  ctx.font = isLocal ? 'bold 12px monospace' : '11px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(isLocal ? 'You' : '●', x, y + PLAYER_SPEED_LABEL_OFFSET + 8)
}

export default function GameWorld() {
  const { players, localId } = useMultiplayer()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playersRef = useRef<Player[]>([])
  const animRef = useRef<number>(0)

  // Keep latest players accessible in the RAF loop without stale closure
  playersRef.current = players

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function render() {
      if (!canvas || !ctx) return

      // Background
      ctx.fillStyle = '#0f0f1a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      const gridSize = 60
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
      }

      // Players
      for (const player of playersRef.current) {
        drawPlayer(ctx, player, player.id === localId)
      }

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [localId])

  const onlineCount = players.length

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Game canvas */}
      <canvas
        ref={canvasRef}
        style={{ display: 'block', background: '#0f0f1a' }}
      />

      {/* Online counter */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 10,
        padding: '10px 18px',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#2ecc71',
          display: 'inline-block',
          boxShadow: '0 0 6px #2ecc71',
        }} />
        {onlineCount} Online
      </div>

      {/* Controls hint */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '8px 16px',
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'monospace',
        fontSize: 12,
      }}>
        Move with WASD or Arrow Keys
      </div>
    </div>
  )
}
