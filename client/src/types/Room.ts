export type { PublicRoom, RoomStatus } from '@shared/types';

/** Temporary identity inside one room, kept in sessionStorage so a refresh can re-join. */
export interface RoomSession {
  code: string;
  playerId: string;
  token: string;
}
