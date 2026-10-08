import { useState } from 'react';
import { AI_PROFILES, DIFFICULTIES } from '@shared/ai';
import { GAME_CONFIG } from '@shared/gameConfig';
import { TRACKS } from '@shared/tracks';
import type { Difficulty, PublicRoom, RoomSettingsPayload } from '@shared/types';
import type { ConnectionState } from '../../store/gameStore';
import PlayerList from '../PlayerList/PlayerList';
import TextOptions from '../TextOptions/TextOptions';
import './RoomLobby.css';

interface RoomLobbyProps {
  room: PublicRoom;
  localId: string;
  connection: ConnectionState;
  onCopy: (text: string, what: string) => void;
  onReady: (ready: boolean) => void;
  onStart: () => void;
  onLeave: () => void;
  onAddBot: (difficulty: Difficulty) => void;
  onRemoveBot: (playerId: string) => void;
  onSettings: (settings: RoomSettingsPayload) => void;
}

/** Alasan host belum bisa memulai (null = siap berangkat). */
export function startBlocker(room: PublicRoom): string | null {
  if (room.status !== 'waiting') return 'Menunggu room direset...';
  if (room.players.length < GAME_CONFIG.minPlayers) {
    return `Butuh minimal ${GAME_CONFIG.minPlayers} pembalap - ajak teman atau tambahkan AI.`;
  }
  if (room.players.some((p) => !p.isBot && !p.connected)) return 'Menunggu pemain yang terputus...';
  const notReady = room.players.filter((p) => !p.isBot && !p.isHost && !p.ready);
  if (notReady.length > 0) return `Menunggu ${notReady.map((p) => p.name).join(', ')} untuk SIAP.`;
  return null;
}

export default function RoomLobby({
  room,
  localId,
  connection,
  onCopy,
  onReady,
  onStart,
  onLeave,
  onAddBot,
  onRemoveBot,
  onSettings,
}: RoomLobbyProps) {
  const [botDifficulty, setBotDifficulty] = useState<Difficulty>('normal');
  const me = room.players.find((p) => p.id === localId);
  const isHost = room.hostId === localId;
  const blocker = startBlocker(room);
  const online = connection === 'connected';
  const full = room.players.length >= room.maxPlayers;
  const inviteLink = `${window.location.origin}/multiplayer/join?code=${room.code}`;
  const settings: RoomSettingsPayload = {
    category: room.category,
    textDifficulty: room.textDifficulty,
    textLength: room.textLength,
    trackId: room.trackId,
  };

  return (
    <div className="lobby">
      <section className="panel panel-pad lobby-code neon-border">
        <span className="eyebrow">Kode room</span>
        <div className="lobby-code-row">
          <span className="lobby-code-value" aria-label={`Kode room ${room.code.split('').join(' ')}`}>
            {room.code}
          </span>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" onClick={() => onCopy(room.code, 'Kode room')}>
              Salin
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => onCopy(inviteLink, 'Link undangan')}>
              Salin link undangan
            </button>
          </div>
        </div>
        <p className="text-dim">
          Bagikan kode ini ke temanmu. Mereka membuka Balap Ketik, memilih GABUNG ROOM, lalu memasukkan kodenya.
        </p>
      </section>

      <div className="lobby-grid">
        <section className="panel panel-pad">
          <div className="lobby-players-head">
            <h2 className="title-md">Pemain</h2>
            <span className="lobby-count">
              <b>{room.players.length}</b> / {room.maxPlayers} PEMAIN
            </span>
          </div>
          <PlayerList
            room={room}
            localId={localId}
            canRemoveBots={isHost && room.status === 'waiting'}
            onRemoveBot={onRemoveBot}
          />

          {isHost && !full && room.status === 'waiting' && (
            <div className="lobby-bot">
              <span className="field-label">Tambah pembalap AI</span>
              <div className="lobby-bot-row">
                <div className="chips">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`chip ${botDifficulty === d ? 'selected' : ''}`}
                      onClick={() => setBotDifficulty(d)}
                      title={`${AI_PROFILES[d].wpm[0]}-${AI_PROFILES[d].wpm[1]} WPM`}
                    >
                      {AI_PROFILES[d].label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn-purple btn-sm"
                  onClick={() => onAddBot(botDifficulty)}
                  disabled={!online}
                >
                  + Tambah AI
                </button>
              </div>
            </div>
          )}

          <div className="lobby-text">
            <h2 className="title-md">Teks balapan</h2>
            <TextOptions
              value={settings}
              disabled={!isHost || room.status !== 'waiting'}
              onChange={(value) => onSettings({ ...settings, ...value })}
            />
            <p className="field-hint">
              {isHost
                ? 'Server memilih satu teks acak sesuai pilihan ini, dan semua pemain mendapat teks yang sama.'
                : 'Hanya host yang dapat mengubah pilihan teks. Semua pemain mendapat teks yang sama.'}
            </p>
          </div>
        </section>

        <aside className="panel panel-pad lobby-side">
          <h2 className="title-md">Pengaturan balapan</h2>
          <div className="field">
            <span className="field-label">Lintasan</span>
            <div className="chips">
              {TRACKS.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  className={`chip ${room.trackId === track.id ? 'selected' : ''}`}
                  disabled={!isHost}
                  title={track.description}
                  onClick={() => onSettings({ ...settings, trackId: track.id })}
                >
                  {track.name}
                </button>
              ))}
            </div>
          </div>
          {!isHost && <p className="field-hint">Hanya host yang dapat mengubah pengaturan.</p>}

          <div className="lobby-actions">
            {isHost ? (
              <>
                <button
                  type="button"
                  className="btn btn-orange btn-lg btn-block"
                  disabled={blocker !== null || !online}
                  onClick={onStart}
                >
                  Mulai balapan
                </button>
                <p className={`lobby-hint ${blocker ? '' : 'ok'}`}>{blocker ?? 'Semua sudah siap - mulai balapan!'}</p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={`btn btn-lg btn-block ${me?.ready ? 'btn-green' : 'btn-primary'}`}
                  disabled={!online || room.status !== 'waiting'}
                  onClick={() => onReady(!me?.ready)}
                >
                  {me?.ready ? 'Siap!' : 'Siap'}
                </button>
                <p className="lobby-hint">
                  {me?.ready ? 'Menunggu host memulai balapan...' : 'Tekan SIAP jika kamu sudah siap.'}
                </p>
              </>
            )}
            <button type="button" className="btn btn-danger btn-block" onClick={onLeave}>
              Keluar room
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
