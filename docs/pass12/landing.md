# Pass 12: themed landing

`landing/index.html` is one page that wears a different game's character screen on each load. It picks a theme at random, avoiding the one this tab showed last (`sessionStorage` key `landing:theme`). `?theme=<name>` pins one for review. The pill in the bottom-left corner, or the `T` key, cycles to the next theme in place and writes `?theme=` into the URL so a reload keeps it.

All copy comes from `docs/SKILLS.md` through `landing/skills.js`: six clusters, four skills each with a one-line proof, and the ten-item top list. `skills.js` leaves out every line SKILLS.md marks `(stretch)`. Edit SKILLS.md first, then mirror the change in `skills.js`.

Begin and Continue reuse `landing/run.js` from pass 11 unchanged. Begin clears every `isoworld:things:<island>` key and opens `../3d/index.html?level=cat-medium&reset=1`; Continue appears only when a save exists and resumes the furthest lit island. A headless check with a seeded save showed Continue in all three themes and hid it with storage empty.

Stills: `out/pass12/landing-{souls,destiny,deck}-{1200,400}.png`.

## Themes

Each theme nods to one game through layout and one or two signature idioms, then draws everything in the isoworld look: flat two-tone panels with a darker bottom bevel, chunky rounded corners, the ink `#2a1f33` and paper `#fffaf0` of the style bible, beam cyan `#12c4f0` for focus and selection, the cloud bed along the bottom, island thumbnails from `assets/start/`, and the pass 11 hero render (`hero.jpg`, `hero-bust.jpg`, shot with `?clip=wiggle`). No game logos, fonts or art.

- **souls** (Elden Ring and Dark Souls character creation). Origin list on the left, turntable hero in an arched frame, attribute panel on the right with Class, Level and Covenant, a serif item-description box, and a "Choose an origin" band that fades across the screen on load. Dusk sky over the cloud bed, gold rules. Begin reads "Arise". Up and down change origin, left and right step through attributes.
- **destiny** (Destiny Director and subclass screens). Emblem nameplate top right with the level as a power number. The six clusters orbit the hero as island-thumbnail planets on dashed rings; picking one opens a subclass diamond of four skill nodes with the proof underneath. Night-blue sky, condensed uppercase type. Begin reads "Launch". Arrows move between planets; Tab into the diamond, where arrows pick the matching node.
- **deck** (deckbuilder card draft). A fanned hand of six cluster cards that bob, a detail panel for the picked card, and a numbered deck list holding the top ten skills. Daylight sky. Begin reads "Play", Continue reads "Resume run". Left and right move through the hand; on a phone the hand scrolls sideways.

Every theme supports tap and click, Tab order reaches Begin and Continue, and on a 400 px screen Begin and Continue pin to a bar along the bottom.

## Adding a theme

1. Write `landing/themes/<name>.js` exporting a default object `{ title, css, mount(root, kit) }`.
   - `css` is a string the shell injects; scope it under `body.t-<name>`. Override `--sky1`, `--sky2`, `--cloud` and `--cloud2` there to recolour the shared sky and cloud bed.
   - `mount` fills `root` and returns `{ begin, cont, label }`: the Begin link, the hidden Continue link, and an element for the "island N" label. The shell wires them through `run.js`.
   - `kit` carries `PERSON`, `CLUSTERS`, `TOP` and `thumb(id)` from `skills.js`, the hero paths `kit.hero` and `kit.bust`, and `kit.on(target, event, fn)`. Register every listener through `kit.on` so the shell removes them on a theme switch.
2. Add one line to `landing/themes/registry.js`: `<name>: () => import("./<name>.js"),`.

The random pick and the cycle order follow the registry. Pass 11's `a.html`, `b.html` and `c.html` stay as they were.

## For the operator

- The game labels ("Arise", "Launch", cluster names such as Agentwright and Pager Tamer) are invented. The proofs under them come from the resume and this repo.
- orva appears on the landing for the first time, in the Studio of One cluster.
- Cluster colours and the order of clusters are arbitrary; the deck list follows the SKILLS.md ranking.
- Web search failed during this pass, so the market view in SKILLS.md rests on three fetched reports.
