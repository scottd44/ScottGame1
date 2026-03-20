import { useState } from 'react'
import GameWorld from './components/GameWorld'
import LobbyScreen from './components/LobbyScreen'

function App() {
  const [mode, setMode] = useState<'desktop' | 'mobile' | null>(null)

  if (!mode) return <LobbyScreen onSelect={setMode} />
  return <GameWorld mode={mode} />
}

export default App
