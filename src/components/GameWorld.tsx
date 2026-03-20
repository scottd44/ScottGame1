import { useEffect, useRef } from 'react'
import { useGame } from '../hooks/useGame'
import type { Player, Bullet, Crate, Obstacle, ZoneState } from '../engine/types'
import { PLAYER_RADIUS, CRATE_SIZE, WEAPON_STATS, MAP_SIZE } from '../engine/constants'
import HUD from './HUD'
import MobileControls from './MobileControls'
import type { MobileInput } from './MobileControls'

// ── Draw helpers ──────────────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, camX: number, camY: number, w: number, h: number) {
  ctx.fillStyle = '#0d1117'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'
  ctx.lineWidth = 1
  const gs = 60
  const sx = (-camX % gs + gs) % gs
  const sy = (-camY % gs + gs) % gs
  for (let x = sx; x < w; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
  for (let y = sy; y < h; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
}

function drawZone(ctx: CanvasRenderingContext2D, zone: ZoneState, camX: number, camY: number, now: number) {
  const sx = zone.cx - camX
  const sy = zone.cy - camY

  // Danger overlay outside zone
  ctx.save()
  ctx.fillStyle = 'rgba(220,50,50,0.08)'
  ctx.fillRect(-camX, -camY, MAP_SIZE, MAP_SIZE)
  // Cut out safe zone
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.arc(sx, sy, zone.radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Zone border pulsing
  const pulse = 0.6 + 0.4 * Math.sin(now / 300)
  ctx.strokeStyle = `rgba(50,150,255,${pulse})`
  ctx.lineWidth = 3
  ctx.shadowColor = '#3399ff'
  ctx.shadowBlur = 12
  ctx.beginPath()
  ctx.arc(sx, sy, zone.radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.shadowBlur = 0

  // Target zone dashed circle
  if (zone.isShrinking || zone.timeUntilShrink < 10) {
    ctx.setLineDash([10, 10])
    ctx.strokeStyle = 'rgba(50,150,255,0.3)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(sx, sy, zone.targetRadius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
}

function drawObstacles(ctx: CanvasRenderingContext2D, obstacles: Obstacle[], camX: number, camY: number) {
  for (const obs of obstacles) {
    const sx = obs.x - camX
    const sy = obs.y - camY
    if (sx + obs.w < 0 || sx > ctx.canvas.width || sy + obs.h < 0 || sy > ctx.canvas.height) continue

    if (obs.type === 'tree') {
      ctx.fillStyle = '#1a3d2b'
      ctx.strokeStyle = '#2d6b40'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(sx + obs.w / 2, sy + obs.h / 2, obs.w / 2, 0, Math.PI * 2)
      ctx.fill(); ctx.stroke()
    } else if (obs.type === 'rock') {
      ctx.fillStyle = '#3a3a4a'
      ctx.strokeStyle = '#55556a'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(sx, sy, obs.w, obs.h, 8)
      ctx.fill(); ctx.stroke()
    } else {
      ctx.fillStyle = '#2a2a3a'
      ctx.strokeStyle = '#44445a'
      ctx.lineWidth = 1.5
      ctx.fillRect(sx, sy, obs.w, obs.h)
      ctx.strokeRect(sx, sy, obs.w, obs.h)
    }
  }
}

function drawCrates(ctx: CanvasRenderingContext2D, crates: Crate[], camX: number, camY: number) {
  for (const crate of crates) {
    if (crate.looted) continue
    const sx = crate.x - camX - CRATE_SIZE / 2
    const sy = crate.y - camY - CRATE_SIZE / 2
    if (sx + CRATE_SIZE < 0 || sx > ctx.canvas.width || sy + CRATE_SIZE < 0 || sy > ctx.canvas.height) continue

    ctx.fillStyle = '#7d4e1a'
    ctx.strokeStyle = '#c47c2a'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(sx, sy, CRATE_SIZE, CRATE_SIZE, 4)
    ctx.fill(); ctx.stroke()

    // Lid line
    ctx.strokeStyle = '#e8a020'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(sx + 3, sy + CRATE_SIZE / 2)
    ctx.lineTo(sx + CRATE_SIZE - 3, sy + CRATE_SIZE / 2)
    ctx.stroke()
  }
}

function drawPlayers(ctx: CanvasRenderingContext2D, players: Player[], localId: string, camX: number, camY: number) {
  for (const p of players) {
    if (!p.alive) continue
    const sx = p.x - camX
    const sy = p.y - camY

    const isLocal = p.id === localId

    // Glow
    if (isLocal) { ctx.shadowColor = p.color; ctx.shadowBlur = 16 }

    // Body
    ctx.beginPath()
    ctx.arc(sx, sy, PLAYER_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = p.color
    ctx.fill()

    // Border
    ctx.strokeStyle = isLocal ? '#ffffff' : 'rgba(255,255,255,0.4)'
    ctx.lineWidth = isLocal ? 2.5 : 1.5
    ctx.stroke()
    ctx.shadowBlur = 0

    // Direction indicator
    const dirX = sx + Math.cos(p.angle) * (PLAYER_RADIUS + 6)
    const dirY = sy + Math.sin(p.angle) * (PLAYER_RADIUS + 6)
    ctx.beginPath()
    ctx.arc(dirX, dirY, 4, 0, Math.PI * 2)
    ctx.fillStyle = isLocal ? '#ffffff' : 'rgba(255,255,255,0.5)'
    ctx.fill()

    // Health bar
    const bw = 36, bh = 5
    const bx = sx - bw / 2, by = sy - PLAYER_RADIUS - 12
    ctx.fillStyle = '#333'
    ctx.fillRect(bx, by, bw, bh)
    const hpColor = p.health > 60 ? '#2ecc71' : p.health > 30 ? '#f39c12' : '#e74c3c'
    ctx.fillStyle = hpColor
    ctx.fillRect(bx, by, bw * (p.health / 100), bh)

    // Weapon label
    if (p.weapon) {
      ctx.fillStyle = WEAPON_STATS[p.weapon].color
      ctx.font = '9px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(WEAPON_STATS[p.weapon].label, sx, sy + PLAYER_RADIUS + 14)
    }

    // "YOU" label
    if (isLocal) {
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('YOU', sx, sy - PLAYER_RADIUS - 16)
    }
  }
}

function drawBullets(ctx: CanvasRenderingContext2D, bullets: Bullet[], camX: number, camY: number) {
  for (const b of bullets) {
    const sx = b.x - camX
    const sy = b.y - camY
    ctx.beginPath()
    ctx.arc(sx, sy, b.weapon === 'sniper' ? 5 : 3, 0, Math.PI * 2)
    ctx.fillStyle = WEAPON_STATS[b.weapon].color
    ctx.shadowColor = WEAPON_STATS[b.weapon].color
    ctx.shadowBlur = 6
    ctx.fill()
    ctx.shadowBlur = 0
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  mode: 'desktop' | 'mobile'
}

export default function GameWorld({ mode }: Props) {
  const mobileInputRef = useRef<MobileInput>({ dx: 0, dy: 0, firing: false, interact: false })

  const {
    localPlayer, players, bulletsRef, crates, obstacles,
    zoneRef, zone, killFeed, healPct, mouseScreen,
    handleInteract,
  } = useGame(mode === 'mobile' ? mobileInputRef : undefined)

  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const playersRef   = useRef(players)
  const cratesRef    = useRef(crates)
  const obstaclesRef = useRef(obstacles)
  const localRef     = useRef(localPlayer)

  playersRef.current   = players
  cratesRef.current    = crates
  obstaclesRef.current = obstacles
  localRef.current     = localPlayer

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    let raf = 0
    const render = () => {
      const lp  = localRef.current
      const now = Date.now()
      const w   = canvas.width
      const h   = canvas.height

      const camX = lp.x - w / 2
      const camY = lp.y - h / 2

      ctx.clearRect(0, 0, w, h)
      drawBackground(ctx, camX, camY, w, h)
      drawZone(ctx, zoneRef.current, camX, camY, now)
      drawObstacles(ctx, obstaclesRef.current, camX, camY)
      drawCrates(ctx, cratesRef.current, camX, camY)
      // Replace local player's presence-synced position with the real local position
      const allPlayers = playersRef.current.map(p => p.id === lp.id ? lp : p)
      drawPlayers(ctx, allPlayers, lp.id, camX, camY)
      drawBullets(ctx, bulletsRef.current, camX, camY)  // reads ref directly — no re-render

      // Crosshair
      const mx = mouseScreen.current.x
      const my = mouseScreen.current.y
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.lineWidth = 1
      const cs = 8
      ctx.beginPath(); ctx.moveTo(mx - cs, my); ctx.lineTo(mx + cs, my); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(mx, my - cs); ctx.lineTo(mx, my + cs); ctx.stroke()

      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [mouseScreen])

  const aliveCount = players.filter(p => p.alive).length

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', cursor: mode === 'desktop' ? 'none' : 'default' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      <HUD
        localPlayer={localPlayer}
        aliveCount={aliveCount}
        zone={zone}
        killFeed={killFeed}
        healPct={healPct}
        crates={crates}
      />
      {mode === 'mobile' && (
        <MobileControls inputRef={mobileInputRef} onInteract={handleInteract} />
      )}
    </div>
  )
}
