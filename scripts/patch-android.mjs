// Ajustes del proyecto Android: horizontal, pantalla completa e ícono
import { readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
const mf = 'android/app/src/main/AndroidManifest.xml';
let x = readFileSync(mf, 'utf8');
if (!x.includes('screenOrientation')) x = x.replace('<activity', '<activity\n            android:screenOrientation="sensorLandscape"');
writeFileSync(mf, x);
const styles = 'android/app/src/main/res/values/styles.xml';
if (existsSync(styles)) {
  let s = readFileSync(styles, 'utf8');
  s = s.replace(/<style name="AppTheme.NoActionBar"[^>]*>/, m => m + '\n        <item name="android:windowFullscreen">true</item>');
  writeFileSync(styles, s);
}
// ícono
const res = 'android/app/src/main/res';
for (const d of readdirSync(res)) if (d.startsWith('mipmap-') && !d.includes('anydpi')) {
  for (const n of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) if (existsSync(`${res}/${d}/${n}`)) copyFileSync('icons/icon-192.png', `${res}/${d}/${n}`);
}
console.log('Android parcheado');
