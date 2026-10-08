import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Difficulty, RoomSettingsPayload } from '@shared/types';
import ConnectionStatus from '../components/ConnectionStatus/ConnectionStatus';
import RoomLobby from '../components/RoomLobby/RoomLobby';
import { connectToServer } from '../hooks/useSocket';
import { getSocket } from '../services/socket';
import { sound } from '../services/sound';
import { useGameStore } from '../store/gameStore';
import './pages.css';

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for http:// LAN addresses where the Clipboard API is blocked
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

export default function Room() {
  const { code: rawCode = '' } = useParams();
  const code = rawCode.toUpperCase();
  const navigate = useNavigate();
  const room = useGameStore((s) => s.room);
  const roomSession = useGameStore((s) => s.roomSession);
  const connection = useGameStore((s) => s.connection);
  const race = useGameStore((s) => s.race);
  const pushToast = useGameStore((s) => s.pushToast);
  const clearRoom = useGameStore((s) => s.clearRoom);
  const setPending = useGameStore((s) => s.setPending);

  const hasSession = roomSession?.code === code;
  const currentRoom = room?.code === code ? room : null;

  // Join flow guard + re-join after a refresh.
  useEffect(() => {
    if (!hasSession || !roomSession) {
      navigate(`/multiplayer/join?code=${code}`, { replace: true });
      return;
    }
    void import('./Race');
    const socket = connectToServer();
    if (socket.connected && !useGameStore.getState().room) {
      setPending('rejoin');
      socket.emit('rejoin_room', roomSession);
    }
  }, [code, hasSession, roomSession, navigate, setPending]);

  // Coming back from the result screen: put the room back into the lobby state.
  useEffect(() => {
    if (currentRoom?.status === 'finished' && connection === 'connected') getSocket().emit('restart_race');
  }, [currentRoom?.status, connection]);

  // A race we belong to is running -> go to the race screen.
  const raceRunning = currentRoom && (currentRoom.status === 'countdown' || currentRoom.status === 'racing');
  const canResume =
    raceRunning && race?.mode === 'multi' && race.roomCode === code && race.raceNumber === currentRoom?.raceNumber;
  useEffect(() => {
    if (canResume) navigate('/race');
  }, [canResume, navigate]);

  if (!hasSession) return null;

  if (!currentRoom || !roomSession) {
    return (
      <div className="page page-narrow">
        <div className="panel panel-pad loading-panel">
          <span className="spinner" />
          <h2 className="title-md">Menyambung ke room {code}...</h2>
          <ConnectionStatus />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              clearRoom();
              navigate('/multiplayer');
            }}
          >
            Batal
          </button>
        </div>
      </div>
    );
  }

  const socket = getSocket();
  const onCopy = async (text: string, what: string) => {
    const ok = await copyToClipboard(text);
    pushToast(ok ? `${what} disalin!` : `Gagal menyalin - ${text}`, ok ? 'success' : 'warning');
  };

  return (
    <div className="page">
      <header className="page-header">
        <span className="eyebrow">Lobi room</span>
        <h1 className="title-lg">Room {currentRoom.code}</h1>
        <ConnectionStatus />
      </header>

      {raceRunning && !canResume && (
        <div className="alert info form-alert">Balapan sedang berlangsung. Kamu akan ikut di balapan berikutnya - tunggu sebentar!</div>
      )}

      <RoomLobby
        room={currentRoom}
        localId={roomSession.playerId}
        connection={connection}
        onCopy={onCopy}
        onReady={(ready) => {
          sound.play('click');
          socket.emit('player_ready', { ready });
        }}
        onStart={() => {
          sound.unlock();
          socket.emit('start_race');
        }}
        onLeave={() => {
          socket.emit('leave_room');
          clearRoom();
          navigate('/multiplayer');
        }}
        onAddBot={(difficulty: Difficulty) => socket.emit('add_bot', { difficulty })}
        onRemoveBot={(playerId: string) => socket.emit('remove_bot', { playerId })}
        onSettings={(settings: RoomSettingsPayload) => socket.emit('update_room_settings', settings)}
      />
    </div>
  );
}
