# Tracks

Tracks are generated procedurally by Phaser (sky, skyline / mountains, road lights,
asphalt, lane dividers, start & finish line) - no image files are required.

To add a track:

1. Add `{ id, name, description }` to `shared/tracks.ts` (the server validates the id).
2. Add a colour theme with the same id to `TRACK_THEMES` in `client/src/game/Track.ts`.
3. Optional: drop background images here and draw them in `TrackView` if you want
   painted art instead of the generated layers.
