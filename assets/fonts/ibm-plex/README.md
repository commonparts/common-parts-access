# IBM Plex

Font files loaded by `app/fonts.ts` through `next/font/local`, so `next build` downloads no font (#486).

- IBM Plex Sans 300, 400, 500, 600 and IBM Plex Mono 400, 500, normal style, Latin subset, WOFF2.
- Taken from `@fontsource/ibm-plex-sans` 5.3.0 and `@fontsource/ibm-plex-mono` 5.3.0, which repackage the Google Fonts build of IBM Plex.
- Licensed under the SIL Open Font License 1.1: see `OFL-IBM-Plex-Sans.txt` and `OFL-IBM-Plex-Mono.txt`.

To add a weight, take the matching `ibm-plex-{sans,mono}-latin-{weight}-normal.woff2` file from the same packages and list it in `app/fonts.ts`.
