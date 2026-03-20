import type { Crate, Obstacle, ObstacleType } from './types'
import { createRng } from './seededRng'
import { CRATE_COUNT, OBSTACLE_COUNT, MAP_SIZE } from './constants'

export function generateMap(seed: number): { crates: Crate[]; obstacles: Obstacle[] } {
  const rng = createRng(seed)
  const obstacles: Obstacle[] = []
  const crates: Crate[] = []
  const types: ObstacleType[] = ['tree', 'rock', 'wall']

  for (let i = 0; i < OBSTACLE_COUNT; i++) {
    const type = rng.pick(types)
    let w: number, h: number
    if (type === 'tree') {
      w = h = rng.range(28, 44)
    } else if (type === 'rock') {
      w = rng.range(40, 80); h = rng.range(40, 80)
    } else {
      const horiz = rng.next() > 0.5
      w = horiz ? rng.range(80, 200) : rng.range(20, 40)
      h = horiz ? rng.range(20, 40) : rng.range(80, 200)
    }
    obstacles.push({
      id: `obs-${i}`,
      x: rng.range(100, MAP_SIZE - 100 - w),
      y: rng.range(100, MAP_SIZE - 100 - h),
      w, h, type,
    })
  }

  for (let i = 0; i < CRATE_COUNT; i++) {
    let x: number, y: number
    let attempts = 0
    do {
      x = rng.range(80, MAP_SIZE - 80)
      y = rng.range(80, MAP_SIZE - 80)
      attempts++
    } while (Math.hypot(x - MAP_SIZE / 2, y - MAP_SIZE / 2) < 150 && attempts < 20)
    crates.push({ id: `crate-${i}`, x, y, looted: false })
  }

  return { crates, obstacles }
}
