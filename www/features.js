// ymPlay · funciones extra: aleatorio, repetir, favoritos, cola y temporizador
(() => {
  const FAV_ID = 'favorites';
  const ls = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const q = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const idxOf = url => tracks.findIndex(t => t.url === url);

  let shuffle = ls('ymPlay_shuffle', '0') === '1';
  let repeat = ls('ymPlay_repeat', 'all'); // off | all | one
  let manualQueue = [];                    // urls
  let sleepEnd = 0, sleepAtEnd = false, sleepTick = null;

  // ---------- Aviso ----------
  const toastEl = document.createElement('div');
  toastEl.className = 'ym-toast';
  document.body.appendChild(toastEl);
  let toastT;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  // ---------- Favoritos (es una playlist llamada "Favoritos") ----------
  function favPl() {
    let pl = playlists.find(p => p.id === FAV_ID);
    if (!pl) { pl = { id: FAV_ID, name: '❤️ Favoritos', songs: [] }; playlists.unshift(pl); savePlaylists(); }
    return pl;
  }
  function isFav(url) {
