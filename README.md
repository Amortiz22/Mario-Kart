# 🏎️ Kartazo Rally

Juego de karts 3D para **navegador y Android** con **salas online para jugar con amigos**.
Todo es original (pilotos, vehículos y pistas) y no necesita servidor propio.

## Qué incluye
- **32 pistas** en 8 copas (Semilla, Nopal, Llama, Cometa, Hoja, Rayo, Corona y Galaxia) con 14 temas: pradera, playa, desierto, nieve, bosque, volcán, ciudad neón, castillo, espacio, selva, cielo, fábrica, cañón y dulces. Hay formas de U, L, T, trébol, corazón y zigzag, más figuras de 8 con puente.
- **6 arenas de batalla**.
- **7 modos**: Gran Premio (copa de 4 pistas con puntos), Carrera VS, Contrarreloj (guarda récords), Eliminación, Guerra de Globos, Robo de Monedas y Bombazo.
- **Sorteo de pista**: en un jugador hay ruleta. Online, cada quien vota y la ruleta elige uno de los votos.
- **12 vehículos** en 5 clases: karts, motos (derrape interior), cuatrimotos, autos y un platillo que flota. Cada uno tiene stats de velocidad, aceleración, manejo, peso y todoterreno.
- **12 pilotos** que afectan el peso, y 12 colores.
- **14 items**: cáscara, disco verde/rastreador (y triples), nitro (y triple), supercarga, rayo encogedor, bomba, caja falsa, calamar de tinta, misil del líder y bolsa de monedas. Salen según tu posición.
- Derrape con mini-turbo de 3 niveles, arrancón, turbo-pads, monedas que suben la velocidad, 50/100/150/200cc y modo espejo.
- Rivales CPU con ajuste dinámico de dificultad.
- Controles de teclado, táctiles y gamepad, música y sonidos sintetizados.

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
js/track.js         generación 3D de pistas y arenas
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
`T('Nombre', 'tema', semilla, tamaño, complejidad, colinas, ancho, { shape: 'U' })`

Formas disponibles: `blob`, `U`, `L`, `T`, `tri`, `zig`, `stadium`, `clover`, `heart`, `bean` o `{ eight: true }`.
