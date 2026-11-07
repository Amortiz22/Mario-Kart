// ===== Salas online P2P con PeerJS (WebRTC) =====
// El anfitrión crea la sala; los demás se conectan con el código.
// Topología estrella: los mensajes de juego (g:1) los reenvía el anfitrión.
const PREFIX = 'kartazo-sala-v1-';
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomCode() { let s = ''; for (let i = 0; i < 5; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)]; return s; }

// Servidor de señalización: por defecto el gratuito de PeerJS.
// Se puede usar uno propio con ?peerhost=mi-servidor.com:443
function peerOpts() {
  const h = new URLSearchParams(location.search).get('peerhost');
  if (!h) return { debug: 0 };
  const [host, port] = h.split(':');
  return { debug: 0, host, port: +(port || 443), path: '/', secure: (port || '443') === '443' };
}

export class Net {
  constructor() {
    this.online = false; this.isHost = true; this.peer = null; this.conns = new Map(); this.hostConn = null;
    this.myId = 'H'; this.onMsg = () => {}; this.onJoin = () => {}; this.onLeave = () => {}; this.onClose = () => {};
  }
  get Peer() { if (!window.Peer) throw new Error('No se pudo cargar PeerJS'); return window.Peer; }

  hostRoom(code) {
    return new Promise((res, rej) => {
      const peer = new this.Peer(PREFIX + code, peerOpts());
      this.peer = peer; this.isHost = true; this.myId = 'H'; this.code = code;
      const to = setTimeout(() => rej(new Error('Tiempo de espera agotado. Revisa tu conexión.')), 15000);
      peer.on('open', () => { clearTimeout(to); this.online = true; res(code); });
      peer.on('error', e => { clearTimeout(to); if (!this.online) rej(new Error(e.type === 'unavailable-id' ? 'Ese código ya está en uso' : 'Error de red: ' + e.type)); });
      peer.on('connection', conn => {
        conn.on('open', () => {
          if (this.conns.size >= 11) { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 300); return; }
          this.conns.set(conn.peer, conn);
          this.onJoin(conn.peer);
        });
        conn.on('data', d => this._fromClient(conn.peer, d));
        conn.on('close', () => { if (this.conns.delete(conn.peer)) this.onLeave(conn.peer); });
        conn.on('error', () => { if (this.conns.delete(conn.peer)) this.onLeave(conn.peer); });
      });
      peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
    });
  }

  joinRoom(code) {
    return new Promise((res, rej) => {
      const peer = new this.Peer(undefined, peerOpts());
      this.peer = peer; this.isHost = false; this.code = code;
      const to = setTimeout(() => rej(new Error('No se encontró la sala (tiempo agotado)')), 15000);
      peer.on('open', id => {
        this.myId = id;
        const conn = peer.connect(PREFIX + code, { reliable: true });
        this.hostConn = conn;
        conn.on('open', () => { clearTimeout(to); this.online = true; res(id); });
        conn.on('data', d => { if (d && d.t === 'full') { rej(new Error('La sala está llena')); return; } this.onMsg(d, 'H'); });
        conn.on('close', () => { this.online = false; this.onClose(); });
      });
      peer.on('error', e => { clearTimeout(to); if (!this.online) rej(new Error(e.type === 'peer-unavailable' ? 'Sala no encontrada' : 'Error de red: ' + e.type)); });
    });
  }

  _fromClient(id, msg) {
    if (!msg || typeof msg !== 'object') return;
    msg.from = id;
    if (msg.g) for (const [cid, c] of this.conns) if (cid !== id && c.open) c.send(msg);
    this.onMsg(msg, id);
  }

  // anfitrión → todos | cliente → anfitrión
  send(msg) {
    if (!this.online) return;
    if (this.isHost) { for (const c of this.conns.values()) if (c.open) c.send(msg); }
    else if (this.hostConn && this.hostConn.open) this.hostConn.send(msg);
  }
  sendTo(id, msg) { const c = this.conns.get(id); if (c && c.open) c.send(msg); }

  // adaptador para la partida: marca los mensajes como de juego
  gameChannel() {
    const self = this;
    return { get online() { return self.online; }, get isHost() { return self.isHost; }, send: m => { m.g = 1; self.send(m); } };
  }

  leave() {
    this.online = false;
    try { for (const c of this.conns.values()) c.close(); this.hostConn && this.hostConn.close(); this.peer && this.peer.destroy(); } catch (e) {}
    this.conns.clear(); this.hostConn = null; this.peer = null; this.isHost = true; this.myId = 'H';
  }
}
