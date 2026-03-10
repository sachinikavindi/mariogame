import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { WebGPUCanvas } from './WebGPUCanvas.jsx'
import { MobileControls } from './mobile/MobileControls.jsx'
import { LoadingScreen } from './LoadingScreen.jsx'
import { BananaGamePopup } from './BananaGamePopup.jsx'
import { useGameStore } from './store.js'

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

function AppContent() {
  const loadingComplete = useGameStore((state) => state.loadingComplete)
  return (
    <div className='canvas-container'>
      {loadingComplete && <LivesDisplay />}
      <MobileControls/>
      <Suspense fallback={false}>
      <WebGPUCanvas />
      </Suspense>
      <LoadingScreen />
      <BananaGamePopup />
      <div className="version">v0.3.4</div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<AppContent />)
