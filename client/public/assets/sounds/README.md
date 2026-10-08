# Sounds

The MVP synthesises every sound with the Web Audio API
(`client/src/services/sound.ts`): engine, countdown, typing, error, combo, nitro,
finish and victory - so this folder can stay empty.

To use real audio files, put e.g. `nitro.mp3` here and map it in `SOUND_FILES`
inside `client/src/services/sound.ts`.
