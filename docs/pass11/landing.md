# Pass 11: landing options

Three character-select screens for the puffer.dev landing, in `landing/`. All three read the same localStorage keys as `index.html` (`isoworld:things:<island>`) through `landing/run.js`: Begin clears them and opens `3d/index.html?level=cat-medium&reset=1` (the first island in `levels/run.json`); Continue appears only when a save exists and resumes the furthest lit island.

Stills: `out/pass11/landing-{a,b,c}-{1200,400}.png`, sheet `out/pass11/landing-sheet.jpg`.

## The hero

`landing/hero.jpg` and `landing/hero-bust.jpg` come from one `tools/shot.mjs` render: `3d/index.html?level=cat-medium&reset=1&ui=0&nav=0&clip=wiggle&zoom=420` at 900x1100, cropped to cut the "Light the bonfire" prompt that `ui=0` leaves on screen. `zoom=` with a number is the close-up; no other camera parameter exists. The pages show a still. A live iframe would dance, but the 3d build writes its own save on load and could switch Continue on for a visitor who never played.

## a.html: souls class select

The CONCEPTS.md character creator, built to its table: turntable avatar on the left, a sheet on the right that cannot be edited, Resume in the corner, one Begin button. Name, Class (Jack of All Trades, marked locked), Origin, Level 10, Starting gift, Covenant. Stat bars with no numbers for three disciplines (engineering, visual art, music) and the seven proficiencies CONCEPTS.md names. Focusing a row writes a one-line description in the souls item-text box. Resume opens a dialog listing the six resume.md roles.

What it says about him: one fixed person whose range is the class. The bar lengths are arbitrary and only set a rough order; the operator should decide whether to keep any ordering.

## b.html: fighting-game roster

Nine fighters on a 3x3 grid, each a facet of the same man: Gatekeeper, Pager Tamer, Agentwright, Cert Warden, Fleetwright, Modernizer, Polyglot, Painter, Bard. Each portrait is an island thumbnail from `assets/start/`; the Player 1 panel shows the hero over that island, blurred, with three named "moves" taken from resume bullets. Arrows move the cursor, Enter locks in and focuses Press Start.

What it says about him: the depth, one specialist per strength, and the punchline that every pick is the same player.

## c.html: RPG loadout and skill tree

A paper doll with six equipped items (Rust Canary, Guardrail Hook, Container Band, Violin, Gateway Plate, Untaught Brush) and three fully unlocked trees: Engineering as the career path from Pixel Hangers to the agent framework, Art, and Music. "Skill points remaining 0" carries the joke. The theme reuses the `index.html` palette.

What it says about him: the order the skills were gained, and the breadth across three trees.

## Where the copy came from

- `assets/resume.md`: every employer, title, date, number and engineering claim (43 percent, 11 agents, 14 skills, 7 procedures, 40+ certificates, 7 auto scaling groups and 16 hosts, four partitions, the WebSocket DoS fix, the open-port finding, Struts to Node, first Go app, GraphQL over Rails, promoted to Senior inside a year), the Technical Skills list, the RAW and Behance links, and the music line (classically trained violinist; self-taught guitarist, drummer, composer/producer).
- `docs/isoworld/CONCEPTS.md`: Class, Origin, Level 10 as years in production, starting gift Violin, Covenant "none yet", bars without numbers, Resume in the corner.
- Site facts: twelve islands, each built from one of his works.

Uncertain, for the operator:

- c.html "Ten media" and its examples (ink crosshatch, acrylic, airbrush, cartoon, psychedelic vector) come from the operator memory note, not resume.md.
- The EDM alias orva appears nowhere on the pages because resume.md does not mention it. Add it to the Bard and Music entries if wanted.
- "Origin: Milwaukee" follows CONCEPTS.md. The resume header gives Lakewood, CO as his current home.
- Fighter, item and move names are invented game labels; the text under each one is from the resume.
