import type { ZoneState } from './types'
import { INITIAL_ZONE_RADIUS, MAP_SIZE, ZONE_PHASES } from './constants'

export function calculateZone(elapsedMs: number): ZoneState {
  const cx = MAP_SIZE / 2
  const cy = MAP_SIZE / 2
  let remaining = elapsedMs
  let currentRadius = INITIAL_ZONE_RADIUS

  for (let i = 0; i < ZONE_PHASES.length; i++) {
    const p = ZONE_PHASES[i]

    if (remaining < p.wait) {
      return {
        cx, cy,
        radius: currentRadius,
        targetRadius: p.targetRadius,
        phase: i,
        damage: p.damage,
        timeUntilShrink: (p.wait - remaining) / 1000,
        isShrinking: false,
      }
    }
    remaining -= p.wait

    if (remaining < p.shrinkDuration) {
      const t = remaining / p.shrinkDuration
      return {
        cx, cy,
        radius: currentRadius + (p.targetRadius - currentRadius) * t,
        targetRadius: p.targetRadius,
        phase: i,
        damage: p.damage,
        timeUntilShrink: 0,
        isShrinking: true,
      }
    }
    remaining -= p.shrinkDuration
    currentRadius = p.targetRadius
  }

  return {
    cx, cy,
    radius: 20,
    targetRadius: 20,
    phase: ZONE_PHASES.length,
    damage: 30,
    timeUntilShrink: 0,
    isShrinking: false,
  }
}
