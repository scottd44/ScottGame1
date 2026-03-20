interface Props {
  onSelect: (mode: 'desktop' | 'mobile') => void
}

export default function LobbyScreen({ onSelect }: Props) {
  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#0d1117',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace', color: '#fff',
      gap: 40,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, fontWeight: 'bold', letterSpacing: 2, color: '#e74c3c' }}>
          SCOTTS GAME
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
          Battle Royale · Last one standing wins
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        <button onClick={() => onSelect('desktop')} style={btnStyle('#3498db')}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🖥️</div>
          <div style={{ fontSize: 18, fontWeight: 'bold' }}>Computer</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>
            WASD · Mouse to aim · Click to shoot · E to loot
          </div>
        </button>

        <button onClick={() => onSelect('mobile')} style={btnStyle('#2ecc71')}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📱</div>
          <div style={{ fontSize: 18, fontWeight: 'bold' }}>Mobile</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>
            Joystick · Fire button · Auto-aim · Tap loot
          </div>
        </button>
      </div>

      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
        Open this on another device to play together
      </div>
    </div>
  )
}

function btnStyle(accent: string): React.CSSProperties {
  return {
    background: 'rgba(255,255,255,0.05)',
    border: `2px solid ${accent}`,
    borderRadius: 16,
    padding: '28px 36px',
    color: '#fff',
    fontFamily: 'monospace',
    cursor: 'pointer',
    textAlign: 'center',
    minWidth: 200,
    transition: 'background 0.2s',
  }
}
