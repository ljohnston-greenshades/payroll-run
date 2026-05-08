# Fonts

Self-hosted fonts live in this directory. Do not load fonts from Google Fonts
or other CDNs — the booth experience must work without external network calls
beyond our own API and HubSpot.

## Required

- `PressStart2P.woff2` — retro pixel-art title + HUD
- `PTSerif-Regular.woff2` — branding headings
- `PTSerif-Bold.woff2` — bold variant of the above
- `SourceSans3-Regular.woff2` — body copy

All four are licensed under the SIL Open Font License (OFL). Download the
woff2 files from each font's source repository (Google Fonts has a one-click
"Download family" button that produces ttf — convert to woff2 with
`fonttools` or grab pre-built woff2 from the upstream repos). Drop them in
this directory under the names above. The `@font-face` declarations in
`src/app/globals.css` already reference these paths.

If the files are missing, the app falls back to the OS default `monospace`,
`serif`, and `sans-serif` stacks — functional but visually off-brand.
