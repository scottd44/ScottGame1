import type { WeaponType } from './types'

export const MAP_SIZE = 2000
export const PLAYER_RADIUS = 14
export const PLAYER_SPEED = 3.5
export const CRATE_SIZE = 28
export const CRATE_COUNT = 35
export const OBSTACLE_COUNT = 60
export const ZONE_DAMAGE_INTERVAL = 500
export const MAP_SEED = 42069

export const WEAPON_STATS: Record<WeaponType, {
  damage: number; fireRate: number; bulletSpeed: number
  range: number; ammoMax: number; color: string; label: string; pellets: number
}> = {
  pistol:        { damage: 25, fireRate: 500,  bulletSpeed: 12, range: 700,  ammoMax: 12, color: '#f1c40f', label: 'Pistol',        pellets: 1 },
  shotgun:       { damage: 18, fireRate: 900,  bulletSpeed: 9,  range: 350,  ammoMax: 6,  color: '#e67e22', label: 'Shotgun',       pellets: 5 },
  assault_rifle: { damage: 16, fireRate: 120,  bulletSpeed: 15, range: 850,  ammoMax: 30, color: '#2ecc71', label: 'Assault Rifle', pellets: 1 },
  sniper:        { damage: 85, fireRate: 1400, bulletSpeed: 28, range: 1800, ammoMax: 5,  color: '#3498db', label: 'Sniper',        pellets: 1 },
}

export const HEAL_STATS = {
  bandage: { heal: 25, useTime: 2000, label: 'Bandage' },
  medkit:  { heal: 75, useTime: 2000, label: 'Medkit' },
}

export const ZONE_PHASES = [
  { wait: 30000, shrinkDuration: 30000, targetRadius: 650, damage: 2 },
  { wait: 20000, shrinkDuration: 25000, targetRadius: 400, damage: 4 },
  { wait: 15000, shrinkDuration: 20000, targetRadius: 200, damage: 6 },
  { wait: 10000, shrinkDuration: 15000, targetRadius: 80,  damage: 10 },
  { wait: 5000,  shrinkDuration: 10000, targetRadius: 20,  damage: 20 },
]

export const INITIAL_ZONE_RADIUS = 900

export const PLAYER_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e91e63', '#ff5722',
]
