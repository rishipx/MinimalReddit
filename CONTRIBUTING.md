# Contributing

Bug reports are most useful with the browser and version, the Reddit page type (feed, post, profile), and the settings involved. "Copy debug info" in the popup helps; read it first and remove anything personal.

For code changes:

1. Keep them focused, and don't reset users' saved settings unless that's the point of the change.
2. Run `npm test`, `npm run check` and `npm run check:syntax`.
3. If you touch the manifest, background code or anything that calls an extension API, run `npm run build` and try both the Chrome and Firefox packages.
4. Reddit selectors go in `src/content/config/selectors.js`.
