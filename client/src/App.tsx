import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import RacingBackground from './components/Background/RacingBackground';
import HowToPlay from './components/HowToPlay/HowToPlay';
import Navbar from './components/Navbar/Navbar';
import Toasts from './components/Toasts/Toasts';
import { useSocketBridge } from './hooks/useSocket';
import CreateRoom from './pages/CreateRoom';
import GameMode from './pages/GameMode';
import Home from './pages/Home';
import JoinRoom from './pages/JoinRoom';
import Multiplayer from './pages/Multiplayer';
import Practice from './pages/Practice';
import Result from './pages/Result';
import Room from './pages/Room';
import SoloSetup from './pages/SoloSetup';
import { sound } from './services/sound';
import { useGameStore } from './store/gameStore';

// The race screen pulls in Phaser - load it only when needed.
const Race = lazy(() => import('./pages/Race'));

export default function App() {
  useSocketBridge();
  const location = useLocation();
  const settings = useGameStore((s) => s.settings);
  const [howToOpen, setHowToOpen] = useState(false);
  const openHowTo = useCallback(() => setHowToOpen(true), []);
  const closeHowTo = useCallback(() => setHowToOpen(false), []);

  useEffect(() => {
    sound.configure(settings.soundOn, settings.volume);
  }, [settings]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const onRace = location.pathname.startsWith('/race');

  return (
    <>
      <RacingBackground />
      {!onRace && <Navbar onHowToPlay={openHowTo} />}
      <main className={`app-main ${onRace ? 'race-main' : ''}`}>
        <Suspense
          fallback={
            <div className="page-loading">
              <span className="spinner" /> Memuat mesin balap
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Home onHowToPlay={openHowTo} />} />
            <Route path="/play" element={<GameMode />} />
            <Route path="/solo" element={<SoloSetup />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/multiplayer" element={<Multiplayer />} />
            <Route path="/multiplayer/create" element={<CreateRoom />} />
            <Route path="/multiplayer/join" element={<JoinRoom />} />
            <Route path="/room/:code" element={<Room />} />
            <Route path="/race" element={<Race />} />
            <Route path="/result" element={<Result />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Toasts />
      <HowToPlay open={howToOpen} onClose={closeHowTo} />
    </>
  );
}
