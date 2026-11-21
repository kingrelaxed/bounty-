# Neon Vice 6

An original offline open-world action game for the make.fun GTA 6 bounty. All
game code and assets are local to `game/`; it makes no network requests and can
be served or packaged without third-party downloads.

Run it locally:

```sh
node serve.ts
```

Then open `http://localhost:8080`.

**Controls:** WASD or arrow keys move, Enter starts or restarts, E/F interacts,
Space fires, P saves, and Escape pauses.

**Mission:** Follow the cyan marker to meet Nova, complete the marina job, and
return to the safehouse. Press E or F near each marker to advance the mission.
Stealing a nearby car or firing raises the visible wanted level. Police units
appear on the map and pursue you; leave them behind to lower heat.
