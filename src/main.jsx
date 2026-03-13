import { Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { WebGPUCanvas } from './WebGPUCanvas.jsx'
import { MobileControls } from './mobile/MobileControls.jsx'
import { LoadingScreen } from './LoadingScreen.jsx'
import { BananaGamePopup } from './BananaGamePopup.jsx'
import { useGameStore } from './store.js'

function formatDuration(ms) {
  const totalMs = Math.max(0, ms || 0)
  const minutes = Math.floor(totalMs / 60000)
  const seconds = Math.floor((totalMs % 60000) / 1000)
  const centis = Math.floor((totalMs % 1000) / 10)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`
}

function LivesDisplay() {
  const lives = useGameStore((state) => state.lives)
  return (
    <div className="lives-display" aria-label={`Lives: ${lives}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`lives-heart ${i < lives ? 'full' : 'empty'}`}>❤</span>
      ))}
    </div>
  )
}

function GameTimer() {
  const gameStatus = useGameStore((s) => s.gameStatus)
  const gameStartAtMs = useGameStore((s) => s.gameStartAtMs)
  const gameEndAtMs = useGameStore((s) => s.gameEndAtMs)
  const [nowMs, setNowMs] = useState(Date.now())

  useEffect(() => {
    if (gameStatus !== 'running') return
    const id = setInterval(() => setNowMs(Date.now()), 100)
    return () => clearInterval(id)
  }, [gameStatus])

  if (!gameStartAtMs) return null
  const end = gameStatus === 'ended' ? (gameEndAtMs ?? nowMs) : nowMs
  const durationMs = Math.max(0, end - gameStartAtMs)

  return (
    <div className="game-timer" aria-label={`Game time ${formatDuration(durationMs)}`}>
      {formatDuration(durationMs)}
    </div>
  )
}

function LeaderboardOverlay() {
  const gameStatus = useGameStore((s) => s.gameStatus)
  const endReason = useGameStore((s) => s.endReason)
  const leaderboard = useGameStore((s) => s.leaderboard)
  const refreshLeaderboard = useGameStore((s) => s.refreshLeaderboard)
  const resetGame = useGameStore((s) => s.resetGame)

  const shouldShow = gameStatus === 'ended'

  useEffect(() => {
    if (!shouldShow) return
    refreshLeaderboard()
  }, [shouldShow, refreshLeaderboard])

  if (!shouldShow) return null

  const sorted = [...leaderboard].sort((a, b) => (a.durationMs ?? 0) - (b.durationMs ?? 0)).slice(0, 10)
  const reasonLabel =
    endReason === 'no_lives' ? 'No lives left' : endReason === 'time' ? 'Time up (2:00)' : 'Finished'

  return (
    <div className="overlay-screen" role="dialog" aria-label="Leaderboard">
      <div className="overlay-card">
        <h2 className="overlay-title">Leaderboard</h2>
        <p className="overlay-subtitle">Game ended: {reasonLabel}</p>
        <div className="leaderboard">
          {sorted.length === 0 ? (
            <div className="leaderboard-empty">No scores yet.</div>
          ) : (
            sorted.map((row, idx) => (
              <div className="leaderboard-row" key={`${row.endedAtMs ?? idx}-${idx}`}>
                <div className="leaderboard-rank">#{idx + 1}</div>
                <div className="leaderboard-name">{row.name}</div>
                <div className="leaderboard-lives">{row.lives ?? 0} ❤</div>
                <div className="leaderboard-time">{formatDuration(row.durationMs)}</div>
              </div>
            ))
          )}
        </div>
        <button className="overlay-button" onClick={resetGame}>
          Play again
        </button>
      </div>
    </div>
  )
}

function AppContent() {
  const loadingComplete = useGameStore((state) => state.loadingComplete)
  const gameStatus = useGameStore((s) => s.gameStatus)
  const startGame = useGameStore((s) => s.startGame)

  useEffect(() => {
    if (loadingComplete && gameStatus === 'idle') startGame()
  }, [loadingComplete, gameStatus, startGame])

  return (
    <div className='canvas-container'>
      {loadingComplete && <LivesDisplay />}
      <GameTimer />
      <MobileControls/>
      <Suspense fallback={false}>
      <WebGPUCanvas />
      </Suspense>
      <LoadingScreen />
      <BananaGamePopup />
      <LeaderboardOverlay />
      <div className="version">v0.3.4</div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<AppContent />)
