const audio = new Audio();
audio.preload = "auto"; 
audio.autoplay = false;

let tracks = [];
let currentIndex = -1;
let playlists = [];
let currentPlaylistId = null;
let currentTab = 'songs'; // Rastrea la pestaña actual

let audioCtx = null;
let sourceNode = null;
let eqFilters = [];
let isEqActive = false; 
const EQ_FREQS = [60, 250, 1000, 4000, 14000];

let playbackMode = 'normal'; 

const CURRENT_APP_VERSION = "1.1.6"; 
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
const favBtn = $('favBtn'); // NUEVO
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
const uiOpacitySlider = $('uiOpacitySlider'); // NUEVO
const customBg = document.getElementById('custom-bg');

const miniPlayer = $('mini-player');
const miniCover = $('miniCover');
const miniTitle = $('miniTitle');
const miniArtist = $('miniArtist');
const miniPlayBtn = $('miniPlayBtn');
const miniPrevBtn = $('miniPrevBtn');
const miniNextBtn = $('miniNextBtn');
const miniInfoBtn = $('miniInfoBtn');

const modeNormal = $('modeNormal');
const modeRepeat = $('modeRepeat');
const modeShuffle = $('modeShuffle');

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
const listTitle = $('listTitle'); // NUEVO

// ... (resto de variables del DOM iguales) ...
const modalNewPlaylist = $('modal-new-playlist');
const newPlaylistName = $('newPlaylistName');
const cancelNewPlaylist = $('cancelNewPlaylist');
const saveNewPlaylist = $('saveNewPlaylist');

const modalSelectSongs = $('modal-select-songs');
const allSongsOptions = $('all-songs-options');
const btnAddSongsToPlaylist = $('btnAddSongsToPlaylist');
const closeAddSongsModal = $('closeAddSongsModal');

const selectionMenu = $('selection-menu');
const sheetOverlay = $('sheet-overlay');
const closeSelectionBtn = $('closeSelectionBtn');
const ctxAddTo = $('ctxAddTo');
const ctxPlayNext = $('ctxPlayNext');
const ctxShare = $('ctxShare');
const ctxHide = $('ctxHide');
const ctxDelete = $('ctxDelete');
const modalCtxPlaylists = $('modal-ctx-playlists');
const ctxPlaylistOptions = $('ctx-playlist-options');
const cancelCtxPlaylist = $('cancelCtxPlaylist');

let selectedTrackObj = null;
let pressTimer;
let wakeLock = null;

// ============================================================
// 1. LÓGICA DE APARIENCIA (OPACIDAD)
// ============================================================
uiOpacitySlider.addEventListener('input', (e) => {
  const val = e.target.value;
  document.documentElement.style.setProperty('--ui-transparency', val);
  localStorage.setItem('ymPlay_uiOpacity', val);
});

// ============================================================
// 2. LÓGICA DE FAVORITOS
// ============================================================
favBtn.addEventListener('click', () => {
    if (currentIndex === -1) return;
    const track = tracks[currentIndex];
    track.isFavorite = !track.isFavorite;
    
    // Actualizar icono
    if (track.isFavorite) {
        favBtn.classList.add('active');
    } else {
        favBtn.classList.remove('active');
    }
    
    saveTracksCache(); // Guardar en memoria
});

// ============================================================
// 3. MODOS DE REPRODUCCIÓN
// ============================================================
function setPlaybackMode(mode) {
    playbackMode = mode;
    modeNormal.classList.remove('active');
    modeRepeat.classList.remove('active');
    modeShuffle.classList.remove('active');
    
    if (mode === 'normal') modeNormal.classList.add('active');
    else if (mode === 'repeat') modeRepeat.classList.add('active');
    else if (mode === 'shuffle') modeShuffle.classList.add('active');
}

modeNormal.addEventListener('click', () => setPlaybackMode('normal'));
modeRepeat.addEventListener('click', () => setPlaybackMode('repeat'));
modeShuffle.addEventListener('click', () => setPlaybackMode('shuffle'));

// ============================================================
// 4. MEMORIA Y CACHÉ
// ============================================================
function loadCachedTracks() {
  const cached = localStorage.getItem('ymPlay_tracks_cache');
  if (cached) {
    tracks = JSON.parse(cached);
    tracks = tracks.filter(t => !t.hidden);
    if (tracks.length > 0) renderPlaylist();
  }
}
function saveTracksCache() { try { localStorage.setItem('ymPlay_tracks_cache', JSON.stringify(tracks)); } catch (e) {} }
function guardarProgreso() {
  if (currentIndex !== -1 && tracks[currentIndex]) {
    localStorage.setItem('ymPlay_lastTrackUrl', tracks[currentIndex].url);
    localStorage.setItem('ymPlay_lastTime', audio.currentTime);
    localStorage.setItem('ymPlay_isPlaying', !audio.paused);
  }
}
function restaurarSesion() {
  const lastUrl = localStorage.getItem('ymPlay_lastTrackUrl');
  const lastTime = parseFloat(localStorage.getItem('ymPlay_lastTime') || 0);
  if (lastUrl) {
    const idx = tracks.findIndex(t => t.url === lastUrl);
    if (idx !== -1) {
      cargarCancion(idx, lastTime);
      if (localStorage.getItem('ymPlay_isPlaying') === 'false') audio.pause();
    }
  }
}

audio.addEventListener('pause', guardarProgreso);
document.addEventListener('visibilitychange', () => { if (document.hidden) guardarProgreso(); });

// ============================================================
// 5. VISTAS
// ============================================================
function showView(viewName) {
  viewSongs.style.display = 'none'; viewPlaylists.style.display = 'none'; viewPlaylistDetail.style.display = 'none'; mainTabs.style.display = 'flex';
  
  if (viewName === 'songs') { 
      currentTab = 'songs';
      viewSongs.style.display = 'flex'; 
      document.querySelectorAll('.tab-btn-main').forEach(b => b.classList.remove('active')); 
      document.querySelector('.tab-btn-main[data-view="songs"]').classList.add('active'); 
      listTitle.innerHTML = 'Canciones <span id="trackCount" style="font-weight:400;font-size:11px;color:var(--text-secondary);">...</span>';
      renderPlaylist();
  } 
  else if (viewName === 'favorites') { 
      currentTab = 'favorites';
      viewSongs.style.display = 'flex'; 
      document.querySelectorAll('.tab-btn-main').forEach(b => b.classList.remove('active')); 
      document.querySelector('.tab-btn-main[data-view="favorites"]').classList.add('active'); 
      listTitle.innerHTML = 'Favoritos <span id="trackCount" style="font-weight:400;font-size:11px;color:var(--text-secondary);">...</span>';
      renderPlaylist();
  }
  else if (viewName === 'playlists') { 
      currentTab = 'playlists';
      viewPlaylists.style.display = 'flex'; 
      document.querySelectorAll('.tab-btn-main').forEach(b => b.classList.remove('active')); 
      document.querySelector('.tab-btn-main[data-view="playlists"]').classList.add('active'); 
      renderPlaylistsList(); 
  } 
  else if (viewName === 'playlist-detail') { 
      currentTab = 'playlist-detail';
      viewPlaylistDetail.style.display = 'flex'; 
      mainTabs.style.display = 'none'; 
  }
}

document.querySelectorAll('.tab-btn-main').forEach(btn => {
  btn.addEventListener('click', (e) => {
    showView(e.target.dataset.view);
  });
});

// ============================================================
// 6. RENDERIZAR LISTA (CON FILTRO DE FAVORITOS)
// ============================================================
function renderPlaylist() {
  if (!playlistEl) return;
  
  let displayTracks = tracks;
  if (currentTab === 'favorites') {
      displayTracks = tracks.filter(t => t.isFavorite);
  }

  const tc = $('trackCount');
  if (tc) tc.textContent = `${displayTracks.length} pistas`;
  
  if (displayTracks.length === 0) { 
      playlistEl.innerHTML = `<li style="justify-content:center;color:var(--text-secondary);">No hay música ${currentTab === 'favorites' ? 'en favoritos' : ''}.</li>`; 
      return; 
  }

  playlistEl.innerHTML = displayTracks.map((t) => {
    let displayCover = t.cover && window.Capacitor?.convertFileSrc ? window.Capacitor.convertFileSrc(t.cover) : '';
    const realIndex = tracks.findIndex(x => x.url === t.url); // Índice real en la lista global
    return `<li data-index="${realIndex}" class="${realIndex === currentIndex ? 'active' : ''}"><div style="display:flex; align-items:center; gap:12px; width: 100%;">${displayCover ? `<img src="${displayCover}" style="width:45px;height:45px;border-radius:8px;object-fit:cover;">` : '<div style="width:45px;height:45px;background:var(--bg-card-solid);border-radius:8px;display:flex;align-items:center;justify-content:center;">🎵</div>'}<div style="display:flex; flex-direction:column; overflow: hidden; text-align: left;"><span style="font-weight:600; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.name} ${t.isFavorite ? '❤️' : ''}</span><span class="pl-artist" style="font-size:12px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.artist}</span></div></div></li>`;
  }).join('');
  
  playlistEl.querySelectorAll('li').forEach(li => {
    const idx = parseInt(li.dataset.index);
    li.addEventListener('click', () => { if (idx !== currentIndex) cargarCancion(idx); abrirReproductor(); });
    li.addEventListener('mousedown', () => startPress(tracks[idx]));
    li.addEventListener('touchstart', () => startPress(tracks[idx]));
    li.addEventListener('mouseup', cancelPress); li.addEventListener('touchend', cancelPress); li.addEventListener('mouseleave', cancelPress);
  });
}

// ============================================================
// 7. REPRODUCTOR (CON LÓGICA DE FAVORITO)
// ============================================================
function cargarCancion(index, startTime = 0) {
  if (index < 0 || index >= tracks.length) return;
  currentIndex = index;
  const track = tracks[index];
  const playableUrl = window.Capacitor?.convertFileSrc ? window.Capacitor.convertFileSrc(track.url) : track.url;
  
  audio.src = playableUrl;
  
  if (startTime > 0) {
    audio.addEventListener('loadedmetadata', function onMetadata() { audio.currentTime = startTime; audio.removeEventListener('loadedmetadata', onMetadata); });
  }

  if(songTitle) songTitle.textContent = track.name;
  if(songArtist) songArtist.textContent = track.artist;
  if (coverBadge) coverBadge.textContent = `Pista ${index + 1} de ${tracks.length}`;

  // Actualizar botón de favorito
  if (track.isFavorite) {
      favBtn.classList.add('active');
  } else {
      favBtn.classList.remove('active');
  }

  let coverUrl = '';
  if (track.cover && coverImg) {
    coverUrl = window.Capacitor?.convertFileSrc ? window.Capacitor.convertFileSrc(track.cover) : track.cover;
    coverImg.src = coverUrl; coverImg.style.display = 'block';
  } else if (coverImg) { coverImg.style.display = 'none'; }

  if (miniPlayer) {
    miniPlayer.style.display = 'flex'; 
    miniTitle.textContent = track.name;
    miniArtist.textContent = track.artist;
    if (coverUrl) { miniCover.src = coverUrl; miniCover.style.display = 'block'; } else { miniCover.style.display = 'none'; }
  }

  updatePlaylistHighlight();
  setupMediaSession(track, coverUrl);
  if(startTime === 0) resetProgress();
  playAudio();
}

// ... (El resto de funciones como playAudio, nextTrack, ecualizador, etc., se mantienen igual) ...

// ============================================================
// 8. ARRANQUE DE LA APP
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  loadPlaylists(); 
  loadCachedTracks();
  
  // Cargar opacidad guardada
  const savedOpacity = localStorage.getItem('ymPlay_uiOpacity');
  if (savedOpacity) {
      uiOpacitySlider.value = savedOpacity;
      document.documentElement.style.setProperty('--ui-transparency', savedOpacity);
  }

  if (window.Capacitor && window.Capacitor.Plugins.LocalNotifications) {
    window.Capacitor.Plugins.LocalNotifications.requestPermissions();
  }

  const savedBg = localStorage.getItem('ymPlay_customBg'); 
  const savedBlur = localStorage.getItem('ymPlay_bgBlur') || 0;
  if (savedBg) { if (bgBlurSlider) bgBlurSlider.value = savedBlur; applyBackground(savedBg, savedBlur); }
  
  setTimeout(() => { escanearMusicaNativa(); }, 1000);
  checkForUpdates();
  setupBackButton();
});
