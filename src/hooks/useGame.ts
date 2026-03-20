import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Player, Bullet, Crate, Obstacle, ZoneState, KillFeedEntry, WeaponType, HealItemType } from '../engine/types'
import { generateMap } from '../engine/mapGen'
import { calculateZone } from '../engine/zone'
import {
  PLAYER_RADIUS, PLAYER_SPEED, WEAPON_STATS, HEAL_STATS,
  MAP_SIZE, CRATE_SIZE, PLAYER_COLORS, ZONE_DAMAGE_INTERVAL, MAP_SEED,
} from '../engine/constants'
import { circleRect, resolveCircleRect, circleCircle } from '../engine/collision'

const { crates: INITIAL_CRATES, obstacles: OBSTACLES } = generateMap(MAP_SEED)

function rndId() { return Math.random().toString(36).slice(2, 10) }
function rndColor() { return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)] }

function makeLocalPlayer(): Player {
  return {
    id: rndId(), color: rndColor(),
    x: MAP_SIZE / 2 + (Math.random() - 0.5) * 200,
    y: MAP_SIZE / 2 + (Math.random() - 0.5) * 200,
    angle: 0, health: 100, weapon: null, ammo: 0,
    healItem: null, alive: true, kills: 0, isHealing: false,
  }
}

import type { MobileInput } from '../components/MobileControls'

export function useGame(mobileInputRef?: React.RefObject<MobileInput>) {
  const [players,   setPlayers]   = useState<Player[]>([])
  const [crates,    setCrates]    = useState<Crate[]>(INITIAL_CRATES)
  const [zone,      setZone]      = useState<ZoneState>(calculateZone(0))
  const [killFeed,  setKillFeed]  = useState<KillFeedEntry[]>([])
  const [healPct,   setHealPct]   = useState(0)

  // Refs for high-frequency data — canvas reads these directly, no React re-render needed
  const bulletsRef2 = useRef<Bullet[]>([])
  const zoneRef2    = useRef<ZoneState>(calculateZone(0))
  const lastZoneUI  = useRef(0)

  const local           = useRef<Player>(makeLocalPlayer())
  const keys            = useRef<Set<string>>(new Set())
  const mouseScreen     = useRef({ x: 0, y: 0 })
  const bulletsRef      = useRef<Bullet[]>([])
  const cratesRef       = useRef<Crate[]>(INITIAL_CRATES)
  const remotePlayers   = useRef<Map<string, Player>>(new Map())
  // Interpolated positions for smooth remote player rendering
  const interpPositions = useRef<Map<string, { x: number; y: number; angle: number }>>(new Map())
  const channelRef    = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const lastFire      = useRef(0)
  const lastZoneDmg   = useRef(0)
  const healStart     = useRef(0)
  const healing       = useRef(false)
  const gameStart     = useRef(Date.now())
  const obstacles     = useRef<Obstacle[]>(OBSTACLES)
  const raf           = useRef(0)

  // ── Damage helper ────────────────────────────────────────────────────
  function applyDamage(dmg: number, attackerId: string, weapon: WeaponType | null) {
    const p = local.current
    if (!p.alive) return
    p.health = Math.max(0, p.health - dmg)
    if (p.health <= 0) {
      p.alive = false
      const killer = remotePlayers.current.get(attackerId)
      const entry: KillFeedEntry = {
        id: rndId(),
        killerColor: killer?.color ?? '#ffffff',
        victimColor: p.color,
        weapon,
        time: Date.now(),
      }
      channelRef.current?.send({ type: 'broadcast', event: 'kill_feed', payload: entry })
      setKillFeed(kf => [entry, ...kf].slice(0, 5))
    }
    channelRef.current?.track({ ...p })
  }

  // ── Supabase channel ──────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel('br-game', {
      config: { presence: { key: local.current.id } },
    })
    channelRef.current = ch

    ch.on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState<Player>()
        const all = Object.values(state).map(e => e[0] as Player)
        remotePlayers.current = new Map(all.map(p => [p.id, p]))
        setPlayers(all)
      })
      .on('broadcast', { event: 'bullet' }, ({ payload }: { payload: Bullet }) => {
        if (payload.ownerId === local.current.id) return
        bulletsRef.current = [...bulletsRef.current, payload]
      })
      .on('broadcast', { event: 'hit' }, ({ payload }: { payload: { targetId: string; damage: number; attackerId: string; weapon: WeaponType } }) => {
        if (payload.targetId === local.current.id) {
          applyDamage(payload.damage, payload.attackerId, payload.weapon)
        }
      })
      .on('broadcast', { event: 'loot_crate' }, ({ payload }: { payload: { crateId: string } }) => {
        cratesRef.current = cratesRef.current.map(c => c.id === payload.crateId ? { ...c, looted: true } : c)
        setCrates([...cratesRef.current])
      })
      .on('broadcast', { event: 'kill_feed' }, ({ payload }: { payload: KillFeedEntry }) => {
        setKillFeed(kf => [payload, ...kf].slice(0, 5))
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') await ch.track({ ...local.current })
      })

    return () => { ch.unsubscribe() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Input ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onDown  = (e: KeyboardEvent) => {
      keys.current.add(e.key.toLowerCase())
      if (e.key.toLowerCase() === 'e') handleInteract()
    }
    const onUp    = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase())
    const onMove  = (e: MouseEvent)    => { mouseScreen.current = { x: e.clientX, y: e.clientY } }
    const onClick = ()                 => handleFire()

    window.addEventListener('keydown',   onDown)
    window.addEventListener('keyup',     onUp)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown',   onDown)
      window.removeEventListener('keyup',     onUp)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onClick)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleFire() {
    const p = local.current
    if (!p.alive || !p.weapon || p.ammo <= 0) return
    const stats = WEAPON_STATS[p.weapon]
    const now = Date.now()
    if (now - lastFire.current < stats.fireRate) return
    lastFire.current = now

    const dx = mouseScreen.current.x - window.innerWidth  / 2
    const dy = mouseScreen.current.y - window.innerHeight / 2
    const len = Math.hypot(dx, dy) || 1

    for (let i = 0; i < stats.pellets; i++) {
      const spread = stats.pellets > 1 ? (Math.random() - 0.5) * 0.3 : 0
      const a = Math.atan2(dy / len, dx / len) + spread
      const b: Bullet = {
        id: `${p.id}-${now}-${i}`, ownerId: p.id, ownerColor: p.color,
        x: p.x, y: p.y,
        vx: Math.cos(a) * stats.bulletSpeed,
        vy: Math.sin(a) * stats.bulletSpeed,
        damage: stats.damage, range: stats.range,
        distanceTraveled: 0, weapon: p.weapon!,
      }
      bulletsRef.current = [...bulletsRef.current, b]
      channelRef.current?.send({ type: 'broadcast', event: 'bullet', payload: b })
    }

    p.ammo--
    if (p.ammo <= 0) { p.weapon = null; p.ammo = 0 }
    channelRef.current?.track({ ...p })
  }

  function handleInteract() {
    const p = local.current
    if (!p.alive) return

    // Try loot crate
    for (const crate of cratesRef.current) {
      if (crate.looted) continue
      if (Math.hypot(p.x - crate.x, p.y - crate.y) > PLAYER_RADIUS + CRATE_SIZE) continue

      const roll = Math.random()
      let item: WeaponType | HealItemType
      if      (roll < 0.15) item = 'sniper'
      else if (roll < 0.35) item = 'assault_rifle'
      else if (roll < 0.55) item = 'shotgun'
      else if (roll < 0.70) item = 'pistol'
      else if (roll < 0.85) item = 'medkit'
      else                  item = 'bandage'

      if (item === 'bandage' || item === 'medkit') {
        p.healItem = item as HealItemType
      } else {
        p.weapon = item as WeaponType
        p.ammo   = WEAPON_STATS[item as WeaponType].ammoMax
      }

      cratesRef.current = cratesRef.current.map(c => c.id === crate.id ? { ...c, looted: true } : c)
      setCrates([...cratesRef.current])
      channelRef.current?.send({ type: 'broadcast', event: 'loot_crate', payload: { crateId: crate.id } })
      channelRef.current?.track({ ...p })
      return
    }

    // Try use heal
    if (p.healItem && !healing.current) {
      healing.current  = true
      healStart.current = Date.now()
      p.isHealing = true
    }
  }

  // ── Game loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    let lastBroadcast = 0

    const loop = () => {
      const now  = Date.now()
      const p    = local.current

      if (p.alive) {
        const k = keys.current
        let { x, y } = p
        let moved = false

        // Keyboard movement
        if (k.has('w') || k.has('arrowup'))    { y -= PLAYER_SPEED; moved = true }
        if (k.has('s') || k.has('arrowdown'))  { y += PLAYER_SPEED; moved = true }
        if (k.has('a') || k.has('arrowleft'))  { x -= PLAYER_SPEED; moved = true }
        if (k.has('d') || k.has('arrowright')) { x += PLAYER_SPEED; moved = true }

        // Mobile joystick movement
        const mob = mobileInputRef?.current
        if (mob && (Math.abs(mob.dx) > 0.05 || Math.abs(mob.dy) > 0.05)) {
          x += mob.dx * PLAYER_SPEED
          y += mob.dy * PLAYER_SPEED
          moved = true
          // Auto-aim: face movement direction on mobile
          p.angle = Math.atan2(mob.dy, mob.dx)
        }

        // Mobile auto-fire: shoot at nearest enemy when fire button held
        if (mob?.firing && p.weapon && p.ammo > 0) {
          handleFire()
        }

        // Cancel heal on move
        if (moved && healing.current) {
          healing.current = false; p.isHealing = false; setHealPct(0)
        }

        // Heal progress
        if (healing.current && p.healItem) {
          const hs = HEAL_STATS[p.healItem]
          const pct = (now - healStart.current) / hs.useTime
          setHealPct(Math.min(pct, 1))
          if (pct >= 1) {
            p.health     = Math.min(100, p.health + hs.heal)
            p.healItem   = null
            healing.current = false
            p.isHealing  = false
            setHealPct(0)
            channelRef.current?.track({ ...p })
          }
        }

        // Clamp to map
        x = Math.max(PLAYER_RADIUS, Math.min(MAP_SIZE - PLAYER_RADIUS, x))
        y = Math.max(PLAYER_RADIUS, Math.min(MAP_SIZE - PLAYER_RADIUS, y))

        // Obstacle collision
        for (const obs of obstacles.current) {
          const r = resolveCircleRect(x, y, PLAYER_RADIUS, obs.x, obs.y, obs.w, obs.h)
          x = r.x; y = r.y
        }

        p.x = x; p.y = y
        p.angle = Math.atan2(
          mouseScreen.current.y - window.innerHeight / 2,
          mouseScreen.current.x - window.innerWidth  / 2,
        )

        // Broadcast at max 20Hz
        if (now - lastBroadcast > 50) {
          channelRef.current?.track({ ...p })
          lastBroadcast = now
        }

        // Zone damage — calculate every frame but only push to React UI at 4Hz
        const elapsed = now - gameStart.current
        const z = calculateZone(elapsed)
        zoneRef2.current = z
        if (now - lastZoneUI.current > 250) {
          setZone(z)
          lastZoneUI.current = now
        }
        if (Math.hypot(p.x - z.cx, p.y - z.cy) > z.radius &&
            now - lastZoneDmg.current > ZONE_DAMAGE_INTERVAL) {
          lastZoneDmg.current = now
          applyDamage(z.damage, 'zone', null)
        }
      }

      // Update bullets
      const next: Bullet[] = []
      for (const b of bulletsRef.current) {
        const nx = b.x + b.vx
        const ny = b.y + b.vy
        const nd = b.distanceTraveled + Math.hypot(b.vx, b.vy)
        if (nd > b.range) continue
        if (nx < 0 || nx > MAP_SIZE || ny < 0 || ny > MAP_SIZE) continue

        let blocked = false
        for (const obs of obstacles.current) {
          if (circleRect(nx, ny, 3, obs.x, obs.y, obs.w, obs.h)) { blocked = true; break }
        }
        if (blocked) continue

        let hit = false
        // My bullets hit remote players
        if (b.ownerId === local.current.id) {
          for (const [, rp] of remotePlayers.current) {
            if (!rp.alive) continue
            if (circleCircle(nx, ny, 4, rp.x, rp.y, PLAYER_RADIUS)) {
              channelRef.current?.send({
                type: 'broadcast', event: 'hit',
                payload: { targetId: rp.id, damage: b.damage, attackerId: local.current.id, weapon: b.weapon },
              })
              hit = true; break
            }
          }
        }
        // Remote bullets can hit local player
        if (!hit && b.ownerId !== local.current.id && local.current.alive) {
          if (circleCircle(nx, ny, 4, local.current.x, local.current.y, PLAYER_RADIUS)) {
            applyDamage(b.damage, b.ownerId, b.weapon)
            hit = true
          }
        }

        if (!hit) next.push({ ...b, x: nx, y: ny, distanceTraveled: nd })
      }
      bulletsRef.current = next
      bulletsRef2.current = next

      raf.current = requestAnimationFrame(loop)
    }

    raf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    localPlayer: local.current,
    players,
    bulletsRef: bulletsRef2,
    crates,
    obstacles: obstacles.current,
    zoneRef: zoneRef2,
    zone,
    killFeed,
    healPct,
    mouseScreen,
    interpPositions,
    handleInteract,
  }
}
