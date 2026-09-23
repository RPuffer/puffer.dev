# Notes
- three r186 lighting divides by pi: ambient and directional intensities need a factor of Math.PI to reach the palette colour on top faces.
- Vertex colours skip sRGB conversion; pass them through `new THREE.Color(hex)` so they land in linear space like material colours.
