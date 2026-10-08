/**
 * Socket hooks.
 *
 * useSocketBridge() is mounted once (App.tsx). It turns room-level server events
 * into store updates, toasts and navigation. High-frequency race events
 * (player_updated, nitro_activated ...) are handled directly by useRace.
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LeaveReason, PublicPlayer, PublicRoom, RaceSnapshot, ServerError, SessionPayload } from '@shared/types';
import { getSocket, hintServerTime, type GameSocket } from '../services/socket';
import { sound } from '../services/sound';
import { useGameStore } from '../store/gameStore';
import { multiRaceId, raceSetupFromSnapshot } from '../utils/raceSetup';

/** Errors that are handled silently (the UI already reflects them). */
const QUIET_ERRORS = new Set<ServerError['code']>([
  'INVALID_PROGRESS',
  'INVALID_FINISH',
  'NITRO_UNAVAILABLE',
  'RATE_LIMITED',
  'RACE_FINISHED',
  'NOT_IN_ROOM',
]);

/** Opens the Socket.IO connection (multiplayer pages only - solo never connects). */
export function connectToServer(): GameSocket {
  const socket = getSocket();
  if (!socket.connected) {
    const { connection, setConnection } = useGameStore.getState();
    if (connection === 'idle' || connection === 'offline') setConnection('connecting');
    socket.connect();
  }
  return socket;
}

/** Connection state + socket for components. */
export function useSocket() {
  const connection = useGameStore((s) => s.connection);
  return { socket: getSocket(), connection, connected: connection === 'connected' };
}

export function useSocketBridge(): void {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    const socket = getSocket();
    const store = useGameStore.getState;
    const go = (path: string) => navigateRef.current(path);
    const path = () => window.location.pathname;

    const onConnect = () => {
      store().setConnection('connected');
      const session = store().roomSession;
      if (session) {
        store().setPending('rejoin');
        socket.emit('rejoin_room', session);
      }
    };

    const onDisconnect = (reason: string) => {
      if (reason === 'io client disconnect') {
        store().setConnection('idle');
        return;
      }
      store().setConnection('reconnecting');
      if (store().roomSession) store().pushToast('Koneksi terputus - menyambung ulang...', 'warning');
    };

    const onConnectError = () => {
      const { pending } = store();
      store().setConnection('offline');
      if (pending === 'create' || pending === 'join') {
        store().setLastError({
          code: 'SERVER_ERROR',
          message: 'Server game tidak bisa dihubungi. Apakah server sudah berjalan?',
        });
        store().setPending(null);
      }
    };

    const onSession = (fromCreate: boolean) => (payload: SessionPayload) => {
      const s = store();
      const pending = s.pending;
      s.setRoomSession({ code: payload.room.code, playerId: payload.playerId, token: payload.token });
      s.setRoom(payload.room);
      s.setPending(null);
      s.setLastError(null);
      if (fromCreate || pending === 'create' || pending === 'join') {
        sound.play('join');
        go(`/room/${payload.room.code}`);
      }
    };
    const onRoomCreated = onSession(true);
    const onRoomJoined = onSession(false);

    const onRoomUpdated = ({ room }: { room: PublicRoom }) => {
      if (store().roomSession?.code === room.code) store().setRoom(room);
    };

    const onPlayerJoined = ({ player }: { player: PublicPlayer }) => {
      if (player.id === store().roomSession?.playerId) return;
      store().pushToast(`${player.name} bergabung ke room.`, 'info');
      sound.play('join');
    };

    const onPlayerLeft = ({ name, reason }: { playerId: string; name: string; reason: LeaveReason }) => {
      const message =
        reason === 'timeout'
          ? `${name} dikeluarkan karena terputus terlalu lama.`
          : reason === 'removed'
            ? `${name} dikeluarkan dari room.`
            : `${name} keluar dari room.`;
      store().pushToast(message, 'info');
    };

    const onNotice = ({ message, tone }: { message: string; tone: 'info' | 'success' | 'warning' }) => {
      store().pushToast(message, tone);
    };

    const onCountdown = (snapshot: RaceSnapshot) => {
      const s = store();
      const session = s.roomSession;
      if (!session || session.code !== snapshot.roomCode) return;
      if (!snapshot.participants.some((p) => p.id === session.playerId)) return;
      hintServerTime(snapshot.serverNow);
      if (s.race?.id === multiRaceId(snapshot.roomCode, snapshot.raceNumber)) return;
      s.setRace(raceSetupFromSnapshot(snapshot, session.playerId));
      go('/race');
    };

    const onRaceStarted = ({ serverNow }: { startAt: number; serverNow: number }) => {
      hintServerTime(serverNow);
    };

    const onRoomClosed = ({ reason }: { reason: string }) => {
      const s = store();
      s.clearRoom();
      s.pushToast(reason, 'warning');
      if (path().startsWith('/room') || path().startsWith('/race')) go('/multiplayer');
    };

    const onError = (error: ServerError) => {
      const s = store();
      const pending = s.pending;
      s.setLastError(error);
      if (error.code === 'SESSION_EXPIRED') {
        const code = s.roomSession?.code;
        s.clearRoom();
        s.pushToast(error.message, 'warning');
        if (path().startsWith('/room') || path().startsWith('/race')) {
          go(`/multiplayer/join${code ? `?code=${code}` : ''}`);
        }
        return;
      }
      if (pending) s.setPending(null);
      if (pending === 'create' || pending === 'join') return; // shown inline on the form
      if (!QUIET_ERRORS.has(error.code)) s.pushToast(error.message, 'error');
    };

    const onReconnectAttempt = () => store().setConnection('reconnecting');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.on('room_created', onRoomCreated);
    socket.on('room_joined', onRoomJoined);
    socket.on('room_updated', onRoomUpdated);
    socket.on('player_joined', onPlayerJoined);
    socket.on('player_left', onPlayerLeft);
    socket.on('notice', onNotice);
    socket.on('race_countdown', onCountdown);
    socket.on('race_started', onRaceStarted);
    socket.on('room_closed', onRoomClosed);
    socket.on('error', onError);
    if (socket.connected) store().setConnection('connected');

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.off('room_created', onRoomCreated);
      socket.off('room_joined', onRoomJoined);
      socket.off('room_updated', onRoomUpdated);
      socket.off('player_joined', onPlayerJoined);
      socket.off('player_left', onPlayerLeft);
      socket.off('notice', onNotice);
      socket.off('race_countdown', onCountdown);
      socket.off('race_started', onRaceStarted);
      socket.off('room_closed', onRoomClosed);
      socket.off('error', onError);
    };
  }, []);
}
