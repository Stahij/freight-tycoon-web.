# Freight Tycoon Web — prototype 0.1.0

Browser-first responsive prototype for desktop and mobile browsers. It uses plain HTML, CSS and JavaScript with no runtime dependencies.

## Prototype features
- Responsive company dashboard.
- Sample freight contracts with route distance, deadlines, payouts and estimated variable costs.
- Starter truck and driver.
- Day-by-day simulation with trip progress, fuel/wear, payouts, penalties, fatigue and payroll.
- Truck condition and paid repairs.
- Central money ledger.
- Local browser save/load via localStorage.
- Automated Node.js tests.

## Run locally
Requires Node.js 20+ for tests and any modern browser. Recommended: run `python -m http.server 8080` from this directory and open `http://localhost:8080`. Run `npm run check`, `npm run build`, and `npm test`.

## Important limitations
This is a playable technical prototype, not the complete game from the original Unity/C# design specification. The map is represented by route cards, offers are fixed sample data, movement is simplified, and economy values are provisional. No accounts, cloud saves, multiplayer, or cross-device sync are implemented.

## Architecture
- `src/game.js`: simulation logic, ledger and save validation.
- `src/app.js`: UI rendering and interactions.
- `styles.css`: responsive interface.
- `tests/game.test.js`: unit and invariant tests.
- `docs/technical-audit.md`: risks identified in the original specification.

GitHub Actions workflows check JavaScript syntax and run tests. A separate workflow is prepared to publish the site through GitHub Pages.


## Online playtest
After the GitHub Pages workflow completes successfully, open: https://stahij.github.io/freight-tycoon-web./

On Android, open the link in Chrome. The prototype stores the current save in that browser on that device.
