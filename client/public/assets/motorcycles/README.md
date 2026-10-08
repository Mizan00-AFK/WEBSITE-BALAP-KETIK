# Motorcycle sprites

Each motorcycle is a single SVG (or PNG) file named after its id in
`shared/motorcycles.ts` (e.g. `speedster.svg`).

Rules so Phaser can animate the sprite:

- canvas / viewBox: **200 x 110**, bike facing **right**, wheels touching the bottom
- rear wheel centre **(44, 82)**, front wheel centre **(160, 82)**, wheel radius **24**, rim radius **15**
- exhaust tip around **(28, 66)** (nitro flame is drawn there)

Phaser draws spinning spokes over the rims (running animation), a wobble for
idle, a flame for nitro and a wheelie for the finish, so a static image is enough.

If a file is missing the game automatically generates a simple placeholder bike.
