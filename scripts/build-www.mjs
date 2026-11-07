// Copia los archivos del juego a www/ (la carpeta que empaqueta Capacitor)
import { cpSync, rmSync, mkdirSync } from 'node:fs';
rmSync('www', { recursive: true, force: true }); mkdirSync('www');
for (const f of ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'vendor', 'icons']) cpSync(f, 'www/' + f, { recursive: true });
console.log('www/ listo');
