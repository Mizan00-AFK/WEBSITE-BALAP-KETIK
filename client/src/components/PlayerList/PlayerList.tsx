import type { CSSProperties } from 'react';
import { AI_PROFILES } from '@shared/ai';
import { playerColor } from '@shared/gameConfig';
import { getMotorcycle } from '@shared/motorcycles';
import type { PublicRoom } from '@shared/types';
import MotoSprite from '../MotoSprite/MotoSprite';
import './PlayerList.css';

interface PlayerListProps {
  room: PublicRoom;
  localId: string;
  canRemoveBots: boolean;
  onRemoveBot: (playerId: string) => void;
}

export default function PlayerList({ room, localId, canRemoveBots, onRemoveBot }: PlayerListProps) {
  const emptySlots = Math.max(0, room.maxPlayers - room.players.length);
  return (
    <ul className="player-list">
      {room.players.map((player) => {
        const status = !player.connected ? 'offline' : player.ready ? 'ready' : 'waiting';
        return (
          <li
            key={player.id}
            className={`player-row ${player.id === localId ? 'me' : ''} ${!player.connected ? 'offline' : ''}`}
            style={{ '--lane-color': playerColor(player.slot).hex } as CSSProperties}
          >
            <span className="pl-lane">P{player.slot + 1}</span>
            <MotoSprite motorcycleId={player.motorcycleId} className="pl-moto" />
            <div className="pl-info">
              <span className="pl-name">
                {player.name}
                {player.id === localId && <em className="tag you">KAMU</em>}
                {player.isHost && <em className="tag host">HOST</em>}
                {player.isBot && player.difficulty && <em className="tag bot">AI {AI_PROFILES[player.difficulty].label}</em>}
              </span>
              <span className="pl-sub">
                {getMotorcycle(player.motorcycleId).name}
                {!player.connected && ' - menyambung ulang...'}
              </span>
            </div>
            <span className={`pl-status ${status}`}>
              {status === 'offline' ? 'TERPUTUS' : status === 'ready' ? 'SIAP' : 'BELUM SIAP'}
            </span>
            {player.isBot && canRemoveBots && (
              <button
                type="button"
                className="pl-remove"
                onClick={() => onRemoveBot(player.id)}
                aria-label={`Keluarkan ${player.name}`}
                title="Keluarkan pembalap AI"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </li>
        );
      })}
      {Array.from({ length: emptySlots }, (_, i) => (
        <li key={`empty-${i}`} className="player-row empty">
          <span className="pl-lane">--</span>
          <span className="pl-empty">SLOT KOSONG</span>
          <span className="pl-empty-hint">Bagikan kode room</span>
        </li>
      ))}
    </ul>
  );
}
