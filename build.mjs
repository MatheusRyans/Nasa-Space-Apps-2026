// Builds two files from src/: dist/index.html (full page) and dist/artifact.html (fragment for the Artifact tool).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const read = f => readFileSync(join(root, 'src', f), 'utf8');
const css = read('style.css'), body = read('body.html');
const js = [read('engine.js'), read('i18n.js'), read('fx.js'), read('app.js')].join('\n;\n');
const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap">';

mkdirSync(join(root, 'dist'), { recursive: true });

const full = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>AIneedHealth</title>
${fonts}
<style>
${css}
</style>
</head>
<body>
${body}
<script>
${js}
</script>
</body>
</html>
`;
writeFileSync(join(root, 'dist', 'index.html'), full);

const fragment = `<meta charset="utf-8">
<title>AIneedHealth</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
<style>
${css}
</style>
${body}
<script>
${js}
</script>
`;
writeFileSync(join(root, 'dist', 'artifact.html'), fragment);
console.log('built dist/index.html (' + full.length + ' bytes) and dist/artifact.html (' + fragment.length + ' bytes)');
