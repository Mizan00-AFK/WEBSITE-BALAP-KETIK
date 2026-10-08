import { Navigate, useNavigate } from 'react-router-dom';
import ResultScreen from '../components/ResultScreen/ResultScreen';
import SessionStats from '../components/SessionStats/SessionStats';
import { connectToServer } from '../hooks/useSocket';
import { sound } from '../services/sound';
import { useGameStore } from '../store/gameStore';
import { createPracticeRace, createSoloRace } from '../utils/raceSetup';
import './pages.css';

export default function Result() {
  const navigate = useNavigate();
  const result = useGameStore((s) => s.lastResult);
  const soloConfig = useGameStore((s) => s.soloConfig);
  const practiceConfig = useGameStore((s) => s.practiceConfig);
  const roomSession = useGameStore((s) => s.roomSession);
  const room = useGameStore((s) => s.room);
  const setRace = useGameStore((s) => s.setRace);
  const clearRoom = useGameStore((s) => s.clearRoom);
  const pushToast = useGameStore((s) => s.pushToast);

  if (!result) return <Navigate to="/" replace />;
  const mode = result.mode;
  const roomAlive = mode === 'multi' && roomSession !== null && roomSession.code === result.roomCode;

  const raceAgain = () => {
    sound.unlock();
    sound.play('click');
    if (mode === 'solo') {
      if (!soloConfig) return navigate('/solo');
      setRace(createSoloRace(soloConfig));
      navigate('/race');
      return;
    }
    if (mode === 'practice') {
      if (!practiceConfig) return navigate('/practice');
      setRace(createPracticeRace(practiceConfig));
      navigate('/race');
      return;
    }
    if (!roomAlive || !roomSession) {
      pushToast('Room itu sudah ditutup. Buat room baru atau gabung ke room lain.', 'warning');
      navigate('/multiplayer');
      return;
    }
    // Room yang sama, balapan baru: reset room lalu tandai diri sendiri SIAP.
    const socket = connectToServer();
    socket.emit('restart_race');
    if (room && room.hostId !== roomSession.playerId) socket.emit('player_ready', { ready: true });
    navigate(`/room/${roomSession.code}`);
  };

  const backToRoom = () => {
    if (mode !== 'multi') {
      navigate(mode === 'practice' ? '/practice' : '/solo');
      return;
    }
    if (!roomAlive || !roomSession) {
      pushToast('Room itu sudah ditutup.', 'warning');
      navigate('/multiplayer');
      return;
    }
    connectToServer().emit('restart_race');
    navigate(`/room/${roomSession.code}`);
  };

  const mainMenu = () => {
    if (mode === 'multi' && roomSession) {
      connectToServer().emit('leave_room');
      clearRoom();
    }
    navigate('/');
  };

  return (
    <div className="page">
      <ResultScreen
        result={result}
        actions={
          <>
            <button type="button" className="btn btn-primary btn-lg" onClick={raceAgain}>
              {mode === 'practice' ? 'Latihan lagi' : 'Balap lagi'}
            </button>
            <button type="button" className="btn btn-ghost btn-lg" onClick={backToRoom}>
              {mode === 'multi' ? 'Kembali ke room' : 'Ubah pengaturan'}
            </button>
            <button type="button" className="btn btn-ghost btn-lg" onClick={mainMenu}>
              Menu utama
            </button>
          </>
        }
      >
        <SessionStats />
      </ResultScreen>
    </div>
  );
}
