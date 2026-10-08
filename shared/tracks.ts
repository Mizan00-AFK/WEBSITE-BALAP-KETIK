/**
 * Track list (ids are validated by the server, visuals live in
 * client/src/game/Track.ts -> TRACK_THEMES).
 */
export interface TrackDef {
  id: string;
  name: string;
  description: string;
}

export const TRACKS: readonly TrackDef[] = [
  { id: 'neon-city', name: 'Kota Neon', description: 'Sirkuit malam di antara gedung-gedung bercahaya.' },
  { id: 'sunset-highway', name: 'Jalan Raya Senja', description: 'Jalan raya pesisir di bawah langit jingga.' },
  { id: 'aurora-pass', name: 'Jalur Aurora', description: 'Jalur pegunungan di bawah cahaya aurora.' },
];

export const DEFAULT_TRACK_ID = TRACKS[0].id;

export function isValidTrack(id: unknown): id is string {
  return typeof id === 'string' && TRACKS.some((t) => t.id === id);
}

export function getTrack(id: string): TrackDef {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0];
}

export function randomTrackId(): string {
  return TRACKS[Math.floor(Math.random() * TRACKS.length)].id;
}
