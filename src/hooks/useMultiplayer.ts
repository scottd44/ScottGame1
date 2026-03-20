import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'

const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c']
const SPEED = 4

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

function randomId() {
  return Math.random().toString(36).slice(2, 10)
}

export interface Player {
  id: string
  color: string
  x: number
  y: number
}

export function useMultiplayer() {
  const [players, setPlayers] = useState<Player[]>([])

  const localPlayer = useRef<Player>({
    id: randomId(),
    color: randomColor(),
    x: Math.floor(Math.random() * 400) + 100,
    y: Math.floor(Math.random() * 400) + 100,
  })

  const keysHeld = useRef<Set<string>>(new Set())
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const channel = supabase.channel('game-room', {
      config: { presence: { key: localPlayer.current.id } },
    })

    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<Player>()
        const all = Object.values(state).map((entries) => entries[0])
        setPlayers(all)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ ...localPlayer.current })
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [])

  // Movement loop
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keysHeld.current.add(e.key)
    const onKeyUp = (e: KeyboardEvent) => keysHeld.current.delete(e.key)

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    const loop = setInterval(() => {
      const keys = keysHeld.current
      let { x, y } = localPlayer.current
      let moved = false

      if (keys.has('ArrowUp') || keys.has('w')) { y -= SPEED; moved = true }
      if (keys.has('ArrowDown') || keys.has('s')) { y += SPEED; moved = true }
      if (keys.has('ArrowLeft') || keys.has('a')) { x -= SPEED; moved = true }
      if (keys.has('ArrowRight') || keys.has('d')) { x += SPEED; moved = true }

      if (moved) {
        localPlayer.current = { ...localPlayer.current, x, y }
        channelRef.current?.track({ ...localPlayer.current })
      }
    }, 1000 / 60) // 60fps

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      clearInterval(loop)
    }
  }, [])

  return { players, localId: localPlayer.current.id }
}
