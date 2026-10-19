import { access } from 'node:fs/promises';
const required = ['index.html','styles.css','src/app.js','src/game.js','manifest.webmanifest','sw.js'];
for (const file of required) await access(new URL(`../${file}`, import.meta.url));
console.log(`Static build check passed: ${required.length} required files found.`);