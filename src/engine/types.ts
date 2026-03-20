export type WeaponType = 'pistol' | 'shotgun' | 'assault_rifle' | 'sniper'
export type HealItemType = 'bandage' | 'medkit'
export type ObstacleType = 'tree' | 'rock' | 'wall'

export interface Player {
  id: string
  color: string
  x: number
  y: number
  angle: number
  health: number
  weapon: WeaponType | null
  ammo: number
  healItem: HealItemType | null
  alive: boolean
  kills: number
  isHealing: boolean
}

export interface Bullet {
  id: string
  ownerId: string
  ownerColor: string
  x: number
  y: number
  vx: number
  vy: number
  damage: number
  range: number
  distanceTraveled: number
  weapon: WeaponType
}

export interface Crate {
  id: string
  x: number
  y: number
  looted: boolean
}

export interface Obstacle {
  id: string
  x: number
  y: number
  w: number
  h: number
  type: ObstacleType
}

export interface ZoneState {
  cx: number
  cy: number
  radius: number
  targetRadius: number
  phase: number
  damage: number
  timeUntilShrink: number
  isShrinking: boolean
}

export interface KillFeedEntry {
  id: string
  killerColor: string
  victimColor: string
  weapon: WeaponType | null
  time: number
}
