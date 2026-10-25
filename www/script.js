const audio = new Audio();
audio.crossOrigin = "anonymous";
let tracks = [];
let currentIndex = -1;
let playlists = [];
let currentPlaylistId = null;

let audioCtx = null;
let sourceNode = null;
let eqFilters = [];
const EQ_FREQS = [60, 250, 1000, 4000, 14000];

const CURRENT_APP_VERSION = "1.0.7"; 
const UPDATE_JSON_URL = "https://wordalastor04-dotcom.github.io/ymPlay/version.json";
const UPDATE_DOWNLOAD_URL = "https://github.com/wordalastor04-dotcom/ymPlay/releases/latest";

const $ = id => document.getElementById(id);
const screenMain = $('screen-main');
const screenPlayer = $('screen-player');
const playlistEl = $('playlist');
const trackCount = $('trackCount');
const btnEscanear = $('btnEscanear');
const songTitle = $('songTitle');
const songArtist = $('songArtist');
const playBtn = $('playBtn');
const playIcon = $('playIcon');
const prevBtn = $('prevBtn');
const nextBtn = $('nextBtn');
const progressFill = $('progressFill');
const progressBar = $('progressBar');
const currentTimeEl = $('currentTime');
const totalTimeEl = $('totalTime');
const coverImg = $('coverImg');
const coverBadge = $('coverBadge');
const backToListBtn = $('backToListBtn');
const bgInput = $('bgInput');
const bgBlurSlider = $('bgBlurSlider');
const customBg = document.getElementById('custom-bg');

const menuBtn = $('menuBtn');
const sideMenu = $('side-menu');
const menuOverlay = $('menu-overlay');
const closeMenuBtn = $('closeMenuBtn');
const sortNewestBtn = $('sortNewestBtn');
const sortOldestBtn = $('sortOldestBtn');
const sortTitleBtn = $('sortTitleBtn');

const updateBanner = $('update-banner');
const downloadUpdateBtn = $('downloadUpdateBtn');
const closeUpdateBtn = $('closeUpdateBtn');

const viewSongs = $('view-songs');
const viewPlaylists = $('view-playlists');
const viewPlaylistDetail = $('view-playlist-detail');
const mainTabs = $('main-tabs');
const btnNewPlaylist = $('btnNewPlaylist');
const playlistsListEl = $('playlists-list');
const playlistDetailTitle = $('playlistDetailTitle');
const playlistDetailList = $('playlist-detail-list');
const backToPlaylistsBtn = $('backToPlaylistsBtn');

const modalNewPlaylist = $('modal-new-playlist');
const newPlaylistName = $('newPlaylistName');
const cancelNewPlaylist = $('cancelNewPlaylist');
const saveNewPlaylist = $('saveNewPlaylist');

const modalSelectSongs = $('modal-select-songs');
const allSongsOptions = $('all-songs-options');
const btnAddSongsToPlaylist = $('btnAddSongsToPlaylist');
const closeAddSongsModal = $('closeAddSongsModal');

// ============================================================
// 1. NOTIFICACIÓN MULTIMEDIA NATIVA (Blindada)
// ============================================================
async function setupMediaSession(track, coverUrl) {
  // Usar el plugin oficial
  const MediaSessionPlugin = window.Capacitor?.Plugins?.MediaSession;

  if (MediaSessionPlugin) {
    try {
      await MediaSessionPlugin.setMetadata({
        title: track.name,
        artist: track.artist,
        album: 'ymPlay',
        artwork: coverUrl ? [{ src: coverUrl, sizes: '512x512', type: 'image/jpeg' }] : []
      });
      
      await MediaSessionPlugin.setActionHandler({ action: 'play' }, () => playAudio());
      await MediaSessionPlugin.setActionHandler({ action: 'pause' }, () => audio.pause());
      await MediaSessionPlugin.setActionHandler({ action: 'previoustrack' }, () => prevTrack());
      await MediaSessionPlugin.setActionHandler({ action: 'nexttrack' }, () => nextTrack());
      
      await MediaSessionPlugin.setPlaybackState({ playbackState: 'playing' });
      
    } catch (e) {
      console.warn("Fallo el plugin nativo, usando Web API:", e);
      setupWebMediaSession(track, coverUrl);
    }
  } else {
    // Si el plugin no existe, usar la API del navegador (no cierra la app)
    setupWebMediaSession(track, coverUrl);
  }
}

function setupWebMediaSession(track, coverUrl) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name, artist: track.artist, album: 'ymPlay',
      artwork: coverUrl ? [{ src: coverUrl, sizes: '512x512', type: 'image/jpeg' }] : []
    });
    navigator.mediaSession.setActionHandler('play', () => playAudio());
    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
    navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
  }
}

// ============================================================
// 2. ACTUALIZACIÓN Y VISTAS
// ============================================================
async function checkForUpdates() {
  try {
    let data;
    if (window.Capacitor && window.Capacitor.Plugins.CapacitorHttp) {
      const response = await window.Capacitor.Plugins.CapacitorHttp.get({ url: UPDATE_JSON_URL });
      data = response.data;
    } else {
      const response = await fetch(UPDATE_JSON_URL);
      data = await response.json();
    }
    if (data && data.version !== CURRENT_APP_VERSION) {
      if (updateBanner) {
        downloadUpdateBtn.onclick = () => window.open(data.url || UPDATE_DOWNLOAD_URL, '_system');
        updateBanner.classList.add('show');
      }
    }
  } catch (e) {}
}
if (closeUpdateBtn) closeUpdateBtn.onclick = () => updateBanner.classList.remove('show');

function showView(viewName) {
  viewSongs.style.display = 'none'; viewPlaylists.style.display = 'none'; viewPlaylistDetail.style.display = 'none'; mainTabs.style.display = 'flex';
  if (viewName === 'songs') {
    viewSongs.style.display = 'flex'; document.querySelectorAll('.tab-btn-main').forEach(b => b.classList.remove('active')); document.querySelector('.tab-btn-main[data-view="songs"]').classList.add('active');
  } else if (viewName === 'playlists') {
    viewPlaylists.style.display = 'flex'; document.querySelectorAll('.tab-btn-main').forEach(b => b.classList.remove('active')); document.querySelector('.tab-btn-main[data-view="playlists"]').classList.add('active');
  } else if (viewName === 'playlist-detail') {
    viewPlaylistDetail.style.display = 'flex'; mainTabs.style.display = 'none';
  }
}

document.querySelectorAll('.tab-btn-main').forEach(btn => {
  btn.addEventListener('click', (e) => {
    showView(e.target.dataset.view);
    if (e.target.dataset.view === 'songs') { currentPlaylistId = null; renderPlaylist(); } else { renderPlaylistsList(); }
  });
});

function loadPlaylists() { const saved = localStorage.getItem('ymPlay_playlists'); if (saved) playlists = JSON.parse(saved); }
function savePlaylists() { localStorage.setItem('ymPlay_playlists', JSON.stringify(playlists)); }

function renderPlaylistsList() {
  playlistsListEl.innerHTML = '';
  if (playlists.length === 0) { playlistsListEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">No tienes playlists creadas.</li>'; return; }
  playlists.forEach(pl => {
    const li = document.createElement('li');
    li.innerHTML = `<div style="display:flex; align-items:center; gap:12px; width: 100%;"><div style="width:45px;height:45px;background:var(--bg-body);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;">🎵</div><div style="display:flex; flex-direction:column; overflow: hidden; text-align: left;"><span style="font-weight:600; font-size:14px;">${pl.name}</span><span style="font-size:12px; color:var(--text-secondary);">${pl.songs.length} canciones</span></div></div>`;
    li.addEventListener('click', () => { currentPlaylistId = pl.id; playlistDetailTitle.textContent = pl.name; showView('playlist-detail'); renderPlaylistDetail(); });
    playlistsListEl.appendChild(li);
  });
}

function renderPlaylistDetail() {
  const pl = playlists.find(p => p.id === currentPlaylistId);
  if (!pl) return;
  const songsInPlaylist = tracks.filter(t => pl.songs.includes(t.url));
  if (songsInPlaylist.length === 0) { playlistDetailList.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Playlist vacía. Toca "+ Añadir canciones".</li>'; return; }
  playlistDetailList.innerHTML = songsInPlaylist.map((t) => {
    let displayCover = t.cover && window.Capacitor?.convertFileSrc ? window.Capacitor.convertFileSrc(t.cover) : '';
    const realIndex = tracks.findIndex(x => x.url === t.url);
    return `<li data-index="${realIndex}" class="${realIndex === currentIndex ? 'active' : ''}"><div style="display:flex; align-items:center; gap:12px; width: 100%;">${displayCover ? `<img src="${displayCover}" style="width:45px;height:45px;border-radius:8px;object-fit:cover;">` : '<div style="width:45px;height:45px;background:var(--bg-card-solid);border-radius:8px;display:flex;align-items:center;justify-content:center;">🎵</div>'}<div style="display:flex; flex-direction:column; overflow: hidden; text-align: left;"><span style="font-weight:600; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.name}</span><span class="pl-artist" style="font-size:12px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.artist}</span></div></div></li>`;
  }).join('');
  playlistDetailList.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => { const idx = parseInt(li.dataset.index); if (idx !== currentIndex) cargarCancion(idx); abrirReproductor(); });
  });
}

backToPlaylistsBtn.addEventListener('click', () => { showView('playlists'); renderPlaylistsList(); });
btnNewPlaylist.addEventListener('click', () => { newPlaylistName.value = ''; modalNewPlaylist.style.display = 'flex'; });
cancelNewPlaylist.addEventListener('click', () => modalNewPlaylist.style.display = 'none');
saveNewPlaylist.addEventListener('click', () => {
  const name = newPlaylistName.value.trim();
  if (name) { playlists.push({ id: Date.now().toString(), name: name, songs: [] }); savePlaylists(); modalNewPlaylist.style.display = 'none'; renderPlaylistsList(); }
});

btnAddSongsToPlaylist.addEventListener('click', () => {
  const pl = playlists.find(p => p.id === currentPlaylistId);
  if (!pl) return;
  allSongsOptions.innerHTML = '';
  if (tracks.length === 0) { allSongsOptions.innerHTML = '<li>No hay música escaneada aún.</li>'; }
  tracks.forEach(t => {
    const isAdded = pl.songs.includes(t.url);
    const li = document.createElement('li');
    li.style.display = 'flex'; li.style.justifyContent = 'space-between'; li.style.alignItems = 'center';
    li.innerHTML = `<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width: 80%;">${t.name}</span><span style="font-size:18px; color:${isAdded ? 'var(--accent)' : 'var(--text-secondary)'}">${isAdded ? '✓' : '+'}</span>`;
    li.addEventListener('click', () => {
      if (!pl.songs.includes(t.url)) { pl.songs.push(t.url); savePlaylists(); li.querySelector('span:last-child').textContent = '✓'; li.querySelector('span:last-child').style.color = 'var(--accent)'; }
    });
    allSongsOptions.appendChild(li);
  });
  modalSelectSongs.style.display = 'flex';
});
closeAddSongsModal.addEventListener('click', () => { modalSelectSongs.style.display = 'none'; renderPlaylistDetail(); });

// ============================================================
// 3. RENDERIZAR Y ESCANEAR MÚSICA
// ============================================================
function renderPlaylist() {
  if (!playlistEl) return;
  if (trackCount) trackCount.textContent = `${tracks.length} pistas`;
  if (tracks.length === 0) { playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">No hay música.</li>'; return; }
  playlistEl.innerHTML = tracks.map((t, i) => {
    let displayCover = t.cover && window.Capacitor?.convertFileSrc ? window.Capacitor.convertFileSrc(t.cover) : '';
    return `<li data-index="${i}" class="${i === currentIndex ? 'active' : ''}"><div style="display:flex; align-items:center; gap:12px; width: 100%;">${displayCover ? `<img src="${displayCover}" style="width:45px;height:45px;border-radius:8px;object-fit:cover;">` : '<div style="width:45px;height:45px;background:var(--bg-card-solid);border-radius:8px;display:flex;align-items:center;justify-content:center;">🎵</div>'}<div style="display:flex; flex-direction:column; overflow: hidden; text-align: left;"><span style="font-weight:600; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.name}</span><span class="pl-artist" style="font-size:12px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.artist}</span></div></div></li>`;
  }).join('');
  playlistEl.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => { const idx = parseInt(li.dataset.index); if (idx !== currentIndex) cargarCancion(idx); abrirReproductor(); });
  });
}

async function escanearMusicaNativa() {
  const MediaStorePlugin = window.Capacitor?.Plugins?.CapacitorMediaStore;
  if (!window.Capacitor || !MediaStorePlugin) {
    if (playlistEl) playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Escaneo solo disponible en el APK.</li>';
    return;
  }
  try {
    if (playlistEl) playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Solicitando permiso de música...</li>';
    await MediaStorePlugin.requestPermissions({ types: ['audio'] });
    if (playlistEl) playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Buscando música...</li>';
    const result = await MediaStorePlugin.getMediasByType({ mediaType: 'audio', sortBy: 'TITLE', includeExternal: true });
    const listaAudios = result.media || result.medias || [];
    if (listaAudios.length > 0) {
      tracks = listaAudios.map(song => ({
        name: song.title || song.name || 'Desconocido',
        artist: song.artist || 'Artista desconocido',
        url: song.url || song.uri || song.path,
        cover: song.albumArt || song.albumArtUri || song.cover || '',
        dateAdded: song.dateAdded || song.date_added || song.dateModified || song.id || 0,
        duration: song.duration || song.durationMs || 0 
      })).filter(t => {
        if (!t.url) return false;
        let dur = t.duration;
        if (dur > 0 && dur < 1000) dur = dur * 1000; 
        return dur >= 60000;
      });
      sortTracks('newest');
    } else {
      if (playlistEl) playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">No se encontró música.</li>';
    }
  } catch (error) {
    if (playlistEl) playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Error al leer archivos. Revisa los permisos en Ajustes.</li>';
  }
}

function sortTracks(criteria) {
  const currentTrackUrl = currentIndex !== -1 && tracks[currentIndex] ? tracks[currentIndex].url : null;
  if (criteria === 'newest') tracks.sort((a, b) => b.dateAdded - a.dateAdded);
  else if (criteria === 'oldest') tracks.sort((a, b) => a.dateAdded - b.dateAdded);
  else if (criteria === 'title') tracks.sort((a, b) => a.name.localeCompare(b.name));
  if (currentTrackUrl) currentIndex = tracks.findIndex(t => t.url === currentTrackUrl);
  if (currentPlaylistId) renderPlaylistDetail(); else renderPlaylist();
  closeMenu();
}

// ============================================================
// 4. REPRODUCTOR Y LÓGICA DE AUDIO
// ============================================================
function openMenu() { if(sideMenu) sideMenu.classList.add('open'); if(menuOverlay) menuOverlay.classList.add('active'); }
function closeMenu() { if(sideMenu) sideMenu.classList.remove('open'); if(menuOverlay) menuOverlay.classList.remove('active'); }

function cargarCancion(index) {
  if (index < 0 || index >= tracks.length) return;
  currentIndex = index;
  const track = tracks[index];
  const playableUrl = window.Capacitor?.convertFileSrc ? window.Capacitor.convertFileSrc(track.url) : track.url;
  
  audio.src = playableUrl;
  
  if(songTitle) songTitle.textContent = track.name;
  if(songArtist) songArtist.textContent = track.artist;
  if (coverBadge) coverBadge.textContent = `Pista ${index + 1} de ${tracks.length}`;

  let coverUrl = '';
  if (track.cover && coverImg) {
    coverUrl = window.Capacitor?.convertFileSrc ? window.Capacitor.convertFileSrc(track.cover) : track.cover;
    coverImg.src = coverUrl;
    coverImg.style.display = 'block';
  } else if (coverImg) {
    coverImg.style.display = 'none';
  }

  setupMediaSession(track, coverUrl);
  resetProgress();
  playAudio();
}

function playAudio() {
  if (currentIndex === -1) return;
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  audio.play().catch(err => console.warn('Error al reproducir:', err));
}

function togglePlay() { if (audio.paused) playAudio(); else audio.pause(); }
function prevTrack() { if (tracks.length) cargarCancion(currentIndex > 0 ? currentIndex - 1 : tracks.length - 1); }
function nextTrack() { if (tracks.length) cargarCancion(currentIndex < tracks.length - 1 ? currentIndex + 1 : 0); }

audio.addEventListener('loadedmetadata', () => { if(totalTimeEl) totalTimeEl.textContent = formatTime(audio.duration); });
audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  if(progressFill) progressFill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
  if(currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
});
audio.addEventListener('play', () => { 
  if(playIcon) playIcon.innerHTML = '<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>'; 
  setupAudioContext();
  if (window.Capacitor?.Plugins?.MediaSession) {
    window.Capacitor.Plugins.MediaSession.setPlaybackState({ playbackState: 'playing' }).catch(()=>{});
  }
});
audio.addEventListener('pause', () => { 
  if(playIcon) playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>'; 
  if (window.Capacitor?.Plugins?.MediaSession) {
    window.Capacitor.Plugins.MediaSession.setPlaybackState({ playbackState: 'paused' }).catch(()=>{});
  }
});
audio.addEventListener('ended', nextTrack);

if (progressBar) {
  progressBar.addEventListener('click', e => {
    if (!audio.duration) return;
    const rect = progressBar.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
  });
}

// ============================================================
// 5. ECUALIZADOR, TEMA, FONDO Y BOTÓN ATRÁS
// ============================================================
function setupAudioContext() {
  if (sourceNode) return; 
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    sourceNode = audioCtx.createMediaElementSource(audio);
    eqFilters = EQ_FREQS.map(freq => { const filter = audioCtx.createBiquadFilter(); filter.type = 'peaking'; filter.frequency.value = freq; filter.Q.value = 1; filter.gain.value = 0; return filter; });
    let prev = sourceNode; eqFilters.forEach(f => { prev.connect(f); prev = f; }); prev.connect(audioCtx.destination);
  } catch (e) {}
}

document.querySelectorAll('#eqSliders input[type="range"]').forEach((slider, i) => {
  slider.addEventListener('input', () => { if (eqFilters[i]) eqFilters[i].gain.value = parseFloat(slider.value); document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active')); });
});

document.getElementById('eqPresets')?.addEventListener('click', e => {
  const btn = e.target.closest('.preset-btn'); if (!btn) return;
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active');
  const gains = { flat: [0,0,0,0,0], rock: [5,3,-1,3,5], pop: [-1,2,4,2,-1], jazz: [3,1,-2,1,3], vocal: [-2,0,4,3,-1] }[btn.dataset.preset] || [0,0,0,0,0];
  document.querySelectorAll('#eqSliders input[type="range"]').forEach((slider, i) => { slider.value = gains[i]; if (eqFilters[i]) eqFilters[i].gain.value = gains[i]; });
});

function abrirReproductor() { if(screenMain) screenMain.style.display = 'none'; if(screenPlayer) screenPlayer.style.display = 'flex'; }
function volverALista() { if(screenPlayer) screenPlayer.style.display = 'none'; if(screenMain) screenMain.style.display = 'flex'; }
function resetProgress() { if(progressFill) progressFill.style.width = '0%'; if(currentTimeEl) currentTimeEl.textContent = '0:00'; if(totalTimeEl) totalTimeEl.textContent = '0:00'; }
function formatTime(sec) { if (isNaN(sec) || !isFinite(sec)) return '0:00'; return `${Math.floor(sec/60)}:${Math.floor(sec%60).toString().padStart(2, '0')}`; }

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => { document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active')); btn.classList.add('active'); document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active'); });
});

if(playBtn) playBtn.addEventListener('click', togglePlay);
if(prevBtn) prevBtn.addEventListener('click', prevTrack);
if(nextBtn) nextBtn.addEventListener('click', nextTrack);
if(backToListBtn) backToListBtn.addEventListener('click', volverALista);
if(menuBtn) menuBtn.addEventListener('click', openMenu);
if(closeMenuBtn) closeMenuBtn.addEventListener('click', closeMenu);
if(menuOverlay) menuOverlay.addEventListener('click', closeMenu);
if(sortNewestBtn) sortNewestBtn.addEventListener('click', () => sortTracks('newest'));
if(sortOldestBtn) sortOldestBtn.addEventListener('click', () => sortTracks('oldest'));
if(sortTitleBtn) sortTitleBtn.addEventListener('click', () => sortTracks('title'));
if(btnEscanear) btnEscanear.addEventListener('click', (e) => { e.preventDefault(); escanearMusicaNativa(); });

function applyBackground(imageSrc, blurAmount) { if (!customBg) return; customBg.style.backgroundImage = `url(${imageSrc})`; customBg.style.filter = `blur(${blurAmount}px)`; document.body.classList.add('has-custom-bg'); }
if (bgInput) { bgInput.addEventListener('change', (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (event) => { const base64Image = event.target.result; try { localStorage.setItem('ymPlay_customBg', base64Image); localStorage.setItem('ymPlay_bgBlur', '0'); if (bgBlurSlider) bgBlurSlider.value = 0; applyBackground(base64Image, 0); } catch (err) { alert("La imagen es muy grande."); } }; reader.readAsDataURL(file); } }); }
if (bgBlurSlider) { bgBlurSlider.addEventListener('input', (e) => { const val = e.target.value; localStorage.setItem('ymPlay_bgBlur', val); if (customBg) customBg.style.filter = `blur(${val}px)`; }); }

const themeBtn = document.getElementById('themeToggle');
if (themeBtn) { themeBtn.addEventListener('click', () => { const html = document.documentElement; html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); }); }
document.querySelectorAll('.palette-dot').forEach(dot => { dot.addEventListener('click', () => { document.querySelectorAll('.palette-dot').forEach(d => d.classList.remove('active')); dot.classList.add('active'); document.documentElement.setAttribute('data-palette', dot.dataset.color); }); });

function setupBackButton() {
  const AppPlugin = window.Capacitor?.Plugins?.App;
  if (AppPlugin) {
    AppPlugin.addListener('backButton', () => {
      if (sideMenu && sideMenu.classList.contains('open')) closeMenu();
      else if (modalSelectSongs.style.display === 'flex' || modalNewPlaylist.style.display === 'flex') { modalSelectSongs.style.display = 'none'; modalNewPlaylist.style.display = 'none'; }
      else if (screenPlayer && screenPlayer.style.display === 'flex') volverALista();
      else if (viewPlaylistDetail && viewPlaylistDetail.style.display === 'flex') { showView('playlists'); renderPlaylistsList(); }
      else if (viewPlaylists && viewPlaylists.style.display === 'flex') { showView('songs'); renderPlaylist(); }
      else AppPlugin.exitApp();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadPlaylists(); 
  
  if (window.Capacitor && window.Capacitor.Plugins.LocalNotifications) {
    window.Capacitor.Plugins.LocalNotifications.requestPermissions().then(result => {
      console.log("Permiso de notificaciones:", result.display);
    });
  } else if ('Notification' in window) {
    Notification.requestPermission();
  }

  const savedBg = localStorage.getItem('ymPlay_customBg'); 
  const savedBlur = localStorage.getItem('ymPlay_bgBlur') || 0;
  if (savedBg) { if (bgBlurSlider) bgBlurSlider.value = savedBlur; applyBackground(savedBg, savedBlur); }
  
  setTimeout(() => { escanearMusicaNativa(); }, 1000);
  checkForUpdates();
  setupBackButton();
});
