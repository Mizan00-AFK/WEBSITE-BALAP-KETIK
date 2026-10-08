export type { PublicPlayer } from '@shared/types';

/** The person using this browser tab (session only - never persisted permanently). */
export interface LocalPlayer {
  nickname: string;
  motorcycleId: string;
}
