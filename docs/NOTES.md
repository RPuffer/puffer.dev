# Notes
- three r186 lighting divides by pi: ambient and directional intensities need a factor of Math.PI to reach the palette colour on top faces.
- Vertex colours skip sRGB conversion; pass them through `new THREE.Color(hex)` so they land in linear space like material colours.
- Reference measures true isometric (pitch 35.264): a top face is 44 px wide and 25.4 px tall, and one block step is 29 px (rim 4 + side 25), so tileH is about 1.14 against the cube's 0.577 side ratio. 2d sprites use 128 px tiles (x2.909 of the reference): top face 128x74, block step 84.
- Gemini draws the away-facing ramp (d=w/n) as the toward-facing one on the first two tries; the third try holds the orientation but splits the slope into two planes. The 2d ramp-w/ramp-n sprites are weak; draw a placeholder wedge if they read wrong in the island.
- Gemini returns JPEG even when asked for PNG; key magenta by flood fill from the frame edge, then drop specks under 0.4% of the main blob, or stray marks survive the key.
