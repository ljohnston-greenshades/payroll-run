# Fonts

Self-hosted fonts live in this directory. Do not load fonts from Google Fonts
or other CDNs — the booth experience must work without external network calls
beyond our own API and HubSpot.

## Required

- `PressStart2P.woff2` — used for the retro pixel-art game title and HUD.

The Press Start 2P font is licensed under the SIL Open Font License (OFL) and
can be downloaded from its source repository. After obtaining the file, place
it here as `PressStart2P.woff2`. The `@font-face` declaration in
`src/app/globals.css` already references this path.
