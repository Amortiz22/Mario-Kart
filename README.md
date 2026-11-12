# 🏎️ Kartazo Rally

Juego de karts 3D para **navegador y Android** con **salas online para jugar con amigos**.
Todo es original (pilotos, vehículos y pistas) y no necesita servidor propio.

## Qué incluye
- **32 pistas** en 8 copas y 14 temas. Hay trazos generados como circuitos reales (curvas en S, horquillas, chicanas) y formas como serpiente, escalera, garra, gancho, rayo, dona, U, L, T, trébol y corazón, además de figuras de 8 con puente.
- **Caminos alternos** que se separan y vuelven a unirse, y **atajos de terracería**: son lentos sin turbo, así que conviene usarlos con un nitro.
- **Rampas** con **trucos en el aire** (al pulsar Derrape) que dan turbo al aterrizar.
- **Saltos sobre huecos**: abismo, río, lava o grieta. Si caes, un dron te rescata.
- **Tramos sin barandal** en las pistas de cielo y espacio, **túneles** y **señales de curva**.
- **Trampas según el tema**: vacas, cangrejos, rocas rodantes, bolas de nieve, asteroides, chicles gigantes, troncos, nubes de tormenta, plantas carnívoras, aplastadores, barras de fuego, géiseres (de agua y de lava), tráfico, aceite, hielo, lodo, arenas movedizas y gelatina.
- **6 arenas de batalla** y **7 modos**: Gran Premio, Carrera VS (con sorteo de pista), Contrarreloj, Eliminación, Guerra de Globos, Robo de Monedas y Bombazo.
- **12 vehículos** (karts, motos con derrape interior, cuatrimotos, autos y un platillo), **12 pilotos** y **14 items**.
- **Manejo arcade**:
  - El volante es suave.
  - En el derrape, el contravolante abre la curva y girar hacia dentro la cierra.
  - El mini-turbo tiene 3 niveles.
  - Los muros te dejan deslizar en lugar de rebotar.
  - Hay arrancón al salir.
- **Controles táctiles** a elegir en Opciones: botones ◀ ▶ grandes, joystick flotante o inclinar el teléfono. Incluyen derrape automático y aceleración automática.
- **Salas online** de hasta 12 jugadores. Navegador y Android juegan juntos.

## Jugar en local
```bash
npx http-server -p 8080 .
# abre http://localhost:8080
```
(Necesita un servidor; abrir el `index.html` con doble clic no funciona por los módulos JS).

## Publicar en GitHub Pages (para jugar con amigos desde el navegador)
1. Crea un repositorio en GitHub y sube esta carpeta a la rama `main`.
2. En el repo, ve a **Settings → Pages → Source: GitHub Actions**.
3. Cada `push` publica el juego en `https://TU-USUARIO.github.io/TU-REPO/`.

## Generar el APK de Android
**Automático (recomendado):** el workflow `.github/workflows/android.yml` compila el APK en cada push.
Descárgalo en **Actions → Compilar APK de Android → Artifacts**.
Si creas un tag (`git tag v1.0 && git push --tags`), el APK también queda en **Releases**.

En el celular, abre el APK y acepta "instalar apps de origen desconocido".

**Manual** (requiere Android Studio / SDK + Java 17):
```bash
npm install
npm run android:init     # solo la primera vez
npm run android:apk      # APK en android/app/build/outputs/apk/debug/
```

**Alternativa sin APK:** abre la página de GitHub Pages en Chrome para Android → menú → "Instalar app". Funciona como app a pantalla completa.

## Multijugador online
- Uno toca **Crear sala** y comparte el código de 5 letras (o el enlace con 🔗).
- Los demás tocan **Unirse**. Navegador y Android juegan juntos en la misma sala.
- Caben hasta 12 jugadores; los lugares vacíos se rellenan con CPU.
- El anfitrión elige las reglas. Luego todos votan la pista y la ruleta decide.
- La conexión es P2P (WebRTC con PeerJS). Para la señalización usa el servidor público gratuito de PeerJS, así que no tienes que pagar ni mantener servidor.
- Si alguna red bloquea la conexión P2P (algunas redes corporativas o escolares), prueben con datos móviles.
- Para usar tu propio servidor PeerJS, agrega `?peerhost=tu-servidor.com:443` a la URL.

## Estructura
```
index.html          pantallas y HUD
css/style.css       estilos
js/data.js          pistas, copas, pilotos, vehículos, items, modos
js/circuit.js       circuitos: formas, caminos alternos, atajos, rampas, huecos, túneles, trampas
js/track.js         texturas, decoración y arenas de batalla
js/models.js        modelos low-poly de vehículos, pilotos e items
js/game.js          física, items, IA, reglas de cada modo
js/net.js           salas online (PeerJS)
js/main.js          menús, garaje, votación, flujo de juego
js/input.js         teclado, táctil, gamepad
js/audio.js         sonido y música sintetizados
vendor/             three.js y PeerJS (incluidos, sin CDN)
```

### Agregar una pista
En `js/data.js`, dentro de una copa, agrega una línea así:
`T('Nombre', 'tema', semilla, tamaño, complejidad, colinas, ancho, { shape: 'gen' })`

- **Formas**: `gen` (procedural), `serpiente`, `escalera`, `garra`, `gancho`, `rayo`, `dona`, `U`, `L`, `T`, `tri`, `zig`, `stadium`, `clover`, `heart`, `bean`, `blob` o `{ eight: true }`.
- **Extras opcionales**: `alt` (número de caminos alternos), `short` (atajo, 0 o 1), `ramps`, `hazards`, `tunnel` (true/false).

Si no los pones, se calculan solos según la complejidad. Cambiar la semilla genera una pista distinta.
