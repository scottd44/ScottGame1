import type { Player, ZoneState, KillFeedEntry, Crate } from '../engine/types'
import { WEAPON_STATS, HEAL_STATS, MAP_SIZE } from '../engine/constants'

interface Props {
  localPlayer: Player
  aliveCount: number
  zone: ZoneState
  killFeed: KillFeedEntry[]
  healPct: number
  crates: Crate[]
}

const panel: React.CSSProperties = {
  background: 'rgba(0,0,0,0.55)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10,
  padding: '10px 14px',
  fontFamily: 'monospace',
  color: '#fff',
  fontSize: 13,
}

function MiniMap({ localPlayer, zone, crates }: Pick<Props, 'localPlayer' | 'zone' | 'crates'>) {
  const size = 160
  const scale = size / MAP_SIZE

  return (
    <div style={{
      ...panel,
      width: size, height: size,
      padding: 0,
      position: 'relative',
      overflow: 'hidden',
      background: 'rgba(10,10,20,0.8)',
    }}>
      {/* Zone circle */}
      <div style={{
        position: 'absolute',
        left:  (zone.cx - zone.radius) * scale,
        top:   (zone.cy - zone.radius) * scale,
        width:  zone.radius * 2 * scale,
        height: zone.radius * 2 * scale,
        borderRadius: '50%',
        border: '1.5px solid rgba(50,150,255,0.7)',
        pointerEvents: 'none',
      }} />
      {/* Crates */}
      {crates.filter(c => !c.looted).map(c => (
        <div key={c.id} style={{
          position: 'absolute',
          left: c.x * scale - 2, top: c.y * scale - 2,
          width: 4, height: 4,
          background: '#c47c2a',
          borderRadius: 1,
        }} />
      ))}
      {/* Local player dot */}
      <div style={{
        position: 'absolute',
        left:  localPlayer.x * scale - 4,
        top:   localPlayer.y * scale - 4,
        width: 8, height: 8,
        background: localPlayer.color,
        borderRadius: '50%',
        border: '1.5px solid white',
        zIndex: 2,
      }} />
      {/* Label */}
      <div style={{
        position: 'absolute', bottom: 4, right: 6,
        fontSize: 9, color: 'rgba(255,255,255,0.4)',
      }}>MAP</div>
    </div>
  )
}

export default function HUD({ localPlayer, aliveCount, zone, killFeed, healPct, crates }: Props) {
  const hp = localPlayer.health
  const hpColor = hp > 60 ? '#2ecc71' : hp > 30 ? '#f39c12' : '#e74c3c'
  const outsideZone = Math.hypot(
    localPlayer.x - zone.cx,
    localPlayer.y - zone.cy,
  ) > zone.radius

  return (
    <>
      {/* Top-right: alive count + zone timer */}
      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
        <div style={panel}>
          <span style={{ color: '#2ecc71', marginRight: 8 }}>●</span>
          {aliveCount} Alive
        </div>
        <div style={panel}>
          {zone.isShrinking
            ? <span style={{ color: '#3399ff' }}>Zone shrinking...</span>
            : <span>Zone closes in <b style={{ color: '#f39c12' }}>{Math.ceil(zone.timeUntilShrink)}s</b></span>
          }
        </div>
      </div>

      {/* Top-left: kill feed */}
      <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {killFeed.map(k => (
          <div key={k.id} style={{ ...panel, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: k.killerColor, fontWeight: 'bold' }}>■</span>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>
              {k.weapon ? WEAPON_STATS[k.weapon].label : 'zone'}
            </span>
            <span style={{ color: k.victimColor, fontWeight: 'bold' }}>■</span>
          </div>
        ))}
      </div>

      {/* Bottom-left: health */}
      <div style={{ position: 'absolute', bottom: 20, left: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ ...panel, minWidth: 180 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>HEALTH</div>
          <div style={{ background: '#222', borderRadius: 4, height: 10, overflow: 'hidden' }}>
            <div style={{
              width: `${hp}%`, height: '100%',
              background: hpColor,
              transition: 'width 0.1s',
            }} />
          </div>
          <div style={{ marginTop: 4, fontWeight: 'bold', color: hpColor }}>{Math.round(hp)} HP</div>
        </div>

        {/* Heal progress */}
        {healPct > 0 && (
          <div style={{ ...panel, minWidth: 180 }}>
            <div style={{ fontSize: 11, color: '#f39c12', marginBottom: 4 }}>HEALING...</div>
            <div style={{ background: '#222', borderRadius: 4, height: 6, overflow: 'hidden' }}>
              <div style={{ width: `${healPct * 100}%`, height: '100%', background: '#f39c12', transition: 'width 0.05s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom-right: weapon / inventory */}
      <div style={{ position: 'absolute', bottom: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        {localPlayer.weapon ? (
          <div style={{ ...panel, minWidth: 160 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>WEAPON</div>
            <div style={{ color: WEAPON_STATS[localPlayer.weapon].color, fontWeight: 'bold', fontSize: 15 }}>
              {WEAPON_STATS[localPlayer.weapon].label}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
              {localPlayer.ammo} / {WEAPON_STATS[localPlayer.weapon].ammoMax} ammo
            </div>
          </div>
        ) : (
          <div style={{ ...panel, color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>No weapon — press E near crate</div>
        )}

        {localPlayer.healItem && (
          <div style={{ ...panel, fontSize: 12 }}>
            <span style={{ color: '#2ecc71' }}>+ </span>
            {HEAL_STATS[localPlayer.healItem].label} (press E to use)
          </div>
        )}
      </div>

      {/* Zone warning */}
      {outsideZone && (
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -200px)',
          background: 'rgba(220,50,50,0.85)',
          border: '2px solid #ff4444',
          borderRadius: 8,
          padding: '8px 20px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          fontSize: 14,
          color: '#fff',
          letterSpacing: 1,
          animation: 'pulse 0.8s ease-in-out infinite',
        }}>
          ⚠ OUTSIDE SAFE ZONE — TAKE COVER
        </div>
      )}

      {/* Controls hint */}
      <div style={{
        position: 'absolute', bottom: 20,
        left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.4)',
        borderRadius: 6, padding: '5px 14px',
        fontFamily: 'monospace', fontSize: 11,
        color: 'rgba(255,255,255,0.35)',
        whiteSpace: 'nowrap',
      }}>
        WASD move · Click shoot · E open crate / heal
      </div>

      {/* Death screen */}
      {!localPlayer.alive && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'monospace',
        }}>
          <div style={{ fontSize: 48, fontWeight: 'bold', color: '#e74c3c', marginBottom: 12 }}>ELIMINATED</div>
          <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)' }}>Refresh to respawn</div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.6 } }
      `}</style>

      {/* Mini-map bottom-left above health */}
      <div style={{ position: 'absolute', bottom: 160, left: 20 }}>
        <MiniMap localPlayer={localPlayer} zone={zone} crates={crates} />
      </div>
    </>
  )
}
