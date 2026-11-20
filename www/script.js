const audio = new Audio();
audio.preload = "auto"; 
audio.autoplay = false;

let tracks = [];
let currentIndex = -1;
let playlists = [];
let currentPlaylistId = null;
let currentTab = 'songs'; 
let currentSearchQuery = ''; 

let audioCtx = null;
let sourceNode = null;
let analyser = null;
let eqFilters = [];
let isEqActive = false; 
const EQ_FREQS = [60, 250, 1000, 4000, 14000];

// Variables para Letras y Visualizador
let currentLyrics = [];
let animationFrameId = null;
const canvas = document.getElementById('audioVisualizer');
const canvasCtx = canvas ? canvas.getContext('2d') : null;

let playbackMode = 'normal'; 

// --- VARIABLES DE VERSIÓN Y ACTUALIZACIÓN ---
const CURRENT_APP_VERSION = "1.3.0"; 
const UPDATE_JSON_URL = "https://wordalastor04-dotcom.github.io/ymPlay/version.json";
const UPDATE_DOWNLOAD_URL = "https://github.com/wordalastor04-dotcom/ymPlay/releases/latest";

let totalListeningSeconds = parseInt(localStorage.getItem('ymPlay_totalListenTime') || '0');
let playCounts = JSON.parse(localStorage.getItem('ymPlay_playCounts') || '{}');

const $ = id => document.getElementById(id);
const screenMain = $('screen-main');
const screenPlayer = $('screen-player');
const screenSettings = $('screen-settings');
const playlistEl = $('playlist');
const btnEscanear = $('btnEscanear');
const songTitle = $('songTitle');
const songArtist = $('songArtist');
const favBtn = $('favBtn');
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
const uiOpacitySlider = $('uiOpacitySlider');
const customBg = document.getElementById('custom-bg');

// Nuevos elementos del reproductor
const playerBg = $('player-bg');
const playerBgInput = $('playerBgInput');
const quickPlayerBgInput = $('quickPlayerBgInput');
const btnToggleLyrics = $('btnToggleLyrics');
const btnTikTokMode = $('btnTikTokMode');
const lyricsBox = $('lyricsBox');
const coverContainer = $('coverContainer');

const searchInput = $('searchInput');
const clearSearchBtn = $('clearSearchBtn');

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

const viewSongs = $('view-songs');
const viewPlaylists = $('view-playlists');
const viewPlaylistDetail = $('view-playlist-detail');
const mainTabs = $('main-tabs');
const btnNewPlaylist = $('btnNewPlaylist');
const playlistsListEl = $('playlists-list');
const playlistDetailTitle = $('playlistDetailTitle');
const playlistDetailList = $('playlist-detail-list');
const backToPlaylistsBtn = $('backToPlaylistsBtn');
const listTitle = $('listTitle');

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

// Elementos Letras
const modalLyrics = $('modal-lyrics');
const manualLyricsInput = $('manualLyricsInput');
const cancelLyricsBtn = $('cancelLyricsBtn');
const saveLyricsBtn = $('saveLyricsBtn');

let selectedTrackObj = null;
let pressTimer;
let wakeLock = null;

// ============================================================
// LÓGICA DE LA BARRA DE BÚSQUEDA
// ============================================================
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.toLowerCase().trim();
        if (clearSearchBtn) clearSearchBtn.style.display = currentSearchQuery.length > 0 ? 'block' : 'none';
        if (currentTab === 'playlist-detail') renderPlaylistDetail();
        else renderPlaylist();
    });
}

if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        currentSearchQuery = '';
        clearSearchBtn.style.display = 'none';
        if (currentTab === 'playlist-detail') renderPlaylistDetail();
        else renderPlaylist();
    });
}

// ============================================================
// VISUALIZADOR DE AUDIO Y WEB AUDIO API
// ============================================================
function setupAudioContext() {
  if (sourceNode) return; 
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    sourceNode = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    
    // Configurar Ecualizador
    eqFilters = EQ_FREQS.map(freq => { 
        const filter = audioCtx.createBiquadFilter(); 
        filter.type = 'peaking'; 
        filter.frequency.value = freq; 
        filter.Q.value = 1; 
        filter.gain.value = 0; 
        return filter; 
    });

    // Conexión: Source -> EQ -> Analyser -> Destino
    let prev = sourceNode; 
    eqFilters.forEach(f => { prev.connect(f); prev = f; }); 
    prev.connect(analyser);
    analyser.connect(audioCtx.destination);
    
    isEqActive = true; 
    drawVisualizer();
  } catch (e) { console.error("Error Web Audio API:", e); }
}

function drawVisualizer() {
    if (!canvasCtx || !analyser) return;
    
    // Ajustar el tamaño del canvas
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function draw() {
        animationFrameId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            
            // Color dinámico basado en el tema
            const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00d2ff';
            canvasCtx.fillStyle = accentColor;
            
            // Dibujar barra estilo TikTok (centrado)
            const y = canvas.height - barHeight;
            canvasCtx.fillRect(x, y, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
    draw();
}

// ============================================================
// LÓGICA DE LETRAS (LRC)
// ============================================================
function parseLRC(lrcText) {
    const lines = lrcText.split('\n');
    const result = [];
    const timeRegEx = /\[(\d{2}):(\d{2}\.\d{2,3})\](.*)/;
    
    lines.forEach(line => {
        const match = timeRegEx.exec(line);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseFloat(match[2]);
            const text = match[3].trim();
            if (text) {
                result.push({ time: minutes * 60 + seconds, text: text });
            }
        }
    });
    return result.sort((a, b) => a.time - b.time);
}

function loadLyricsForTrack(track) {
    if (!lyricsBox) return;
    const savedLyrics = localStorage.getItem(`ymPlay_lyrics_${track.url}`);
    
    if (savedLyrics) {
        currentLyrics = parseLRC(savedLyrics);
        if (currentLyrics.length > 0) {
            lyricsBox.innerHTML = '<div style="text-align:center; opacity:0.6; padding:20px;">Letra sincronizada</div>';
        } else {
            lyricsBox.innerHTML = `<div style="text-align:center; padding:20px; line-height:1.8;">${savedLyrics.replace(/\n/g, '<br>')}</div>`;
        }
    } else {
        currentLyrics = [];
        lyricsBox.innerHTML = '<p style="opacity: 0.5;">No hay letras disponibles.<br><small>Toca aquí para añadir letra manual</small></p>';
    }
}

function updateLyrics(currentTime) {
    if (currentLyrics.length === 0) return;
    
    let activeLine = null;
    for (let i = currentLyrics.length - 1; i >= 0; i--) {
        if (currentTime >= currentLyrics[i].time) {
            activeLine = currentLyrics[i];
            break;
        }
    }

    if (activeLine) {
        // Solo actualizar si cambió la línea para no sobrecargar el DOM
        if (lyricsBox.dataset.activeText !== activeLine.text) {
            lyricsBox.dataset.activeText = activeLine.text;
            lyricsBox.innerHTML = `<div class="lyric-line active" style="font-size: 18px; font-weight: bold; color: var(--accent); text-shadow: 0 0 10px var(--accent-glow); transition: all 0.3s; transform: scale(1.05); padding: 20px;">${activeLine.text}</div>`;
        }
    }
}

if (lyricsBox) {
    lyricsBox.addEventListener('click', () => {
        if (currentIndex !== -1) {
            const saved = localStorage.getItem(`ymPlay_lyrics_${tracks[currentIndex].url}`);
            manualLyricsInput.value = saved || '';
            modalLyrics.style.display = 'flex';
        }
    });
}

if (cancelLyricsBtn) cancelLyricsBtn.addEventListener('click', () => modalLyrics.style.display = 'none');

if (saveLyricsBtn) {
    saveLyricsBtn.addEventListener('click', () => {
        if (currentIndex === -1) return;
        const text = manualLyricsInput.value;
        if (text.trim()) {
            localStorage.setItem(`ymPlay_lyrics_${tracks[currentIndex].url}`, text);
        } else {
            localStorage.removeItem(`ymPlay_lyrics_${tracks[currentIndex].url}`);
        }
        modalLyrics.style.display = 'none';
        loadLyricsForTrack(tracks[currentIndex]);
    });
}

// ============================================================
// MODOS DE VISUALIZACIÓN Y TIKTOK
// ============================================================
if (btnToggleLyrics) {
    btnToggleLyrics.addEventListener('click', () => {
        const tabBar = document.querySelector('.bottom-panel');
        if(tabBar) tabBar.style.display = tabBar.style.display === 'none' ? 'block' : 'none';
    });
}

if (btnTikTokMode) {
    btnTikTokMode.addEventListener('click', () => {
        document.body.classList.toggle('tiktok-mode');
        const isTikTok = document.body.classList.contains('tiktok-mode');
        btnTikTokMode.style.color = isTikTok ? '#fff' : '#ff0050';
        btnTikTokMode.style.borderColor = isTikTok ? '#fff' : '#ff0050';
    });
}

// ============================================================
// FONDOS Y APARIENCIA
// ============================================================
function applyPlayerBackground(imageSrc) {
    if (!playerBg) return;
    if (imageSrc) {
        playerBg.style.backgroundImage = `url(${imageSrc})`;
        playerBg.style.opacity = '1';
    } else {
        playerBg.style.backgroundImage = 'none';
        playerBg.style.opacity = '0';
    }
}

function handlePlayerBgUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target.result;
            try {
                localStorage.setItem('ymPlay_playerBg', base64);
                applyPlayerBackground(base64);
            } catch (err) { alert("Imagen muy grande."); }
        };
        reader.readAsDataURL(file);
    }
}

if (playerBgInput) playerBgInput.addEventListener('change', handlePlayerBgUpload);
if (quickPlayerBgInput) quickPlayerBgInput.addEventListener('change', handlePlayerBgUpload);

// Extraer color de la portada para efectos de luz
function extractColorFromCover(imageSrc) {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageSrc;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 10; canvas.height = 10;
        ctx.drawImage(img, 0, 0, 10, 10);
        const data = ctx.getImageData(0, 0, 10, 10).data;
        let r=0, g=0, b=0, count=0;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i+3] < 128) continue;
            r += data[i]; g += data[i+1]; b += data[i+2]; count++;
        }
        if (count > 0) {
            r = Math.floor(r/count); g = Math.floor(g/count); b = Math.floor(b/count);
            const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            // Aplicar color de glow a los anillos
            document.documentElement.style.setProperty('--cover-color', hex);
            document.documentElement.style.setProperty('--cover-glow', `rgba(${r}, ${g}, ${b}, 0.6)`);
        }
    };
}

// ============================================================
// REPRODUCTOR Y LÓGICA PRINCIPAL
// ============================================================
function cargarCancion(index, startTime = 0) {
  if (index < 0 || index >= tracks.length) return;
  currentIndex = index;
  const track = tracks[index];
  const playableUrl = window.Capacitor?.convertFileSrc ? window.Capacitor.convertFileSrc(track.url) : track.url;
  
  audio.src = playableUrl;
  
  playCounts[track.url] = (playCounts[track.url] || 0) + 1;
  localStorage.setItem('ymPlay_playCounts', JSON.stringify(playCounts));
  updateStatsUI();

  if (startTime > 0) {
    audio.addEventListener('loadedmetadata', function onMetadata() { audio.currentTime = startTime; audio.removeEventListener('loadedmetadata', onMetadata); });
  }

  if(songTitle) songTitle.textContent = track.name;
  if(songArtist) songArtist.textContent = track.artist;
  if (coverBadge) coverBadge.textContent = `Pista ${index + 1} de ${tracks.length}`;

  if (track.isFavorite) favBtn.classList.add('active');
  else favBtn.classList.remove('active');

  let coverUrl = '';
  if (track.cover && coverImg) {
    coverUrl = window.Capacitor?.convertFileSrc ? window.Capacitor.convertFileSrc(track.cover) : track.cover;
    coverImg.src = coverUrl; coverImg.style.display = 'block';
    extractColorFromCover(coverUrl);
  } else if (coverImg) { coverImg.style.display = 'none'; }

  if (miniPlayer) {
    miniPlayer.style.display = 'flex'; 
    miniTitle.textContent = track.name;
    miniArtist.textContent = track.artist;
    if (coverUrl) { miniCover.src = coverUrl; miniCover.style.display = 'block'; } else { miniCover.style.display = 'none'; }
  }

  // Cargar Letras y fondo
  loadLyricsForTrack(track);
  const savedPlayerBg = localStorage.getItem('ymPlay_playerBg');
  applyPlayerBackground(savedPlayerBg);

  updatePlaylistHighlight();
  setupMediaSession(track, coverUrl);
  if(startTime === 0) resetProgress();
  playAudio();
}

function playAudio() { 
    if (currentIndex === -1) return; 
    audio.play().catch(err => console.warn('Error:', err)); 
}
function togglePlay() { if (audio.paused) playAudio(); else audio.pause(); }

function getActiveQueue() {
  if (currentPlaylistId !== null) { const pl = playlists.find(p => p.id === currentPlaylistId); if (pl) return tracks.filter(t => pl.songs.includes(t.url) && !t.hidden); }
  return tracks.filter(t => !t.hidden);
}

function prevTrack() { 
  const queue = getActiveQueue(); if (queue.length === 0) return;
  const currentUrl = tracks[currentIndex]?.url; let qIndex = queue.findIndex(t => t.url === currentUrl);
  if (qIndex === -1) qIndex = 0; 
  const prevQIndex = (qIndex - 1 + queue.length) % queue.length;
  const realIndex = tracks.findIndex(t => t.url === queue[prevQIndex].url);
  if (realIndex !== -1) cargarCancion(realIndex);
}

function nextTrack() { 
  const queue = getActiveQueue(); if (queue.length === 0) return;
  
  if (playbackMode === 'shuffle') {
    let randomIndex = Math.floor(Math.random() * queue.length);
    if (queue.length > 1) {
        while (queue[randomIndex].url === tracks[currentIndex]?.url) {
            randomIndex = Math.floor(Math.random() * queue.length);
        }
    }
    const realIndex = tracks.findIndex(t => t.url === queue[randomIndex].url);
    if (realIndex !== -1) cargarCancion(realIndex);
    return;
  }

  const currentUrl = tracks[currentIndex]?.url; let qIndex = queue.findIndex(t => t.url === currentUrl);
  if (qIndex === -1) qIndex = -1; 
  const nextQIndex = (qIndex + 1) % queue.length;
  const realIndex = tracks.findIndex(t => t.url === queue[nextQIndex].url);
  if (realIndex !== -1) cargarCancion(realIndex);
}

function setupMediaSession(track, coverUrl) {
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.name, artist: track.artist, album: 'ymPlay',
        artwork: coverUrl ? [{ src: coverUrl, sizes: '512x512', type: 'image/jpeg' }] : []
      });
      navigator.mediaSession.setActionHandler('play', () => playAudio());
      navigator.mediaSession.setActionHandler('pause', () => audio.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
    } catch (e) {}
  }
}

audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  if(progressFill) progressFill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
  if(currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
  
  // Actualizar Letras
  updateLyrics(audio.currentTime);
});

audio.addEventListener('play', () => { 
  if(playIcon) playIcon.innerHTML = '<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>'; 
  if(miniPlayBtn) miniPlayBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>';
  requestWakeLock(); 
  setupAudioContext(); // Siempre iniciar contexto al dar play
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  
  if(coverContainer) coverContainer.classList.add('is-playing');
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
});

audio.addEventListener('pause', () => { 
  if(playIcon) playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>'; 
  if(miniPlayBtn) miniPlayBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  if(coverContainer) coverContainer.classList.remove('is-playing');
  releaseWakeLock(); 
});

audio.addEventListener('ended', () => {
    if (playbackMode === 'repeat') { audio.currentTime = 0; playAudio(); } 
    else { nextTrack(); }
});

// ============================================================
// ECUALIZADOR (Modificado para usar el nuevo AudioContext)
// ============================================================
document.querySelectorAll('#eqSliders input[type="range"]').forEach((slider, i) => {
  slider.addEventListener('input', () => { 
    setupAudioContext(); 
    if (eqFilters[i]) eqFilters[i].gain.value = parseFloat(slider.value); 
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active')); 
  });
});

document.getElementById('eqPresets')?.addEventListener('click', e => {
  setupAudioContext();
  const btn = e.target.closest('.preset-btn'); if (!btn) return;
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active');
  const gains = { flat: [0,0,0,0,0], rock: [5,3,-1,3,5], pop: [-1,2,4,2,-1], jazz: [3,1,-2,1,3], vocal: [-2,0,4,3,-1] }[btn.dataset.preset] || [0,0,0,0,0];
  document.querySelectorAll('#eqSliders input[type="range"]').forEach((slider, i) => { slider.value = gains[i]; if (eqFilters[i]) eqFilters[i].gain.value = gains[i]; });
});

document.getElementById('eqResetBtn')?.addEventListener('click', () => {
    document.querySelectorAll('#eqSliders input[type="range"]').forEach((slider, i) => {
        slider.value = 0;
        if (eqFilters[i]) eqFilters[i].gain.value = 0;
    });
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.preset-btn[data-preset="flat"]').classList.add('active');
});

// ============================================================
// FUNCIONES RESTANTES (Escaneo, Playlists, Eventos UI, etc.)
// ============================================================
async function iniciarServicioSegundoPlano() {
    const ForegroundService = window.Capacitor?.Plugins?.ForegroundService;
    if (ForegroundService) {
        try {
            await ForegroundService.startForegroundService({ id: 1, title: "ymPlay", body: "Reproduciendo música..." });
        } catch (e) {}
    }
}
async function detenerServicioSegundoPlano() {
    const ForegroundService = window.Capacitor?.Plugins?.ForegroundService;
    if (ForegroundService) {
        try { await ForegroundService.stopForegroundService(); } catch (e) {}
    }
}
async function requestWakeLock() {
  try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (err) {}
  iniciarServicioSegundoPlano(); 
}
function releaseWakeLock() { 
    if (wakeLock !== null) { wakeLock.release(); wakeLock = null; } 
    detenerServicioSegundoPlano(); 
}

function formatStatTime(totalSeconds) { const h = Math.floor(totalSeconds / 3600); const m = Math.floor((totalSeconds % 3600) / 60); return `${h}h ${m}m`; }
function updateStatsUI() {
    if ($('statTotalTime')) $('statTotalTime').textContent = formatStatTime(totalListeningSeconds);
    let topSongUrl = null; let maxPlays = 0;
    for (const url in playCounts) { if (playCounts[url] > maxPlays) { maxPlays = playCounts[url]; topSongUrl = url; } }
    if (topSongUrl && $('statTopSong')) {
        const track = tracks.find(t => t.url === topSongUrl);
        $('statTopSong').textContent = track ? track.name : 'Desconocida';
    }
}
setInterval(() => {
    if (!audio.paused && currentIndex !== -1) {
        totalListeningSeconds++;
        localStorage.setItem('ymPlay_totalListenTime', totalListeningSeconds);
        if(totalListeningSeconds % 5 === 0) updateStatsUI();
    }
}, 1000);

function loadCachedTracks() {
  const cached = localStorage.getItem('ymPlay_tracks_cache');
  if (cached) { tracks = JSON.parse(cached); if (tracks.length > 0) renderPlaylist(); }
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

function showView(viewName) {
  viewSongs.style.display = 'none'; viewPlaylists.style.display = 'none'; viewPlaylistDetail.style.display = 'none'; mainTabs.style.display = 'flex';
  if (viewName === 'songs') { 
      currentTab = 'songs'; currentPlaylistId = null; viewSongs.style.display = 'flex'; 
      document.querySelectorAll('.tab-btn-main').forEach(b => b.classList.remove('active')); document.querySelector('.tab-btn-main[data-view="songs"]').classList.add('active'); 
      if(listTitle) listTitle.innerHTML = 'Canciones <span id="trackCount" style="font-weight:400;font-size:11px;color:var(--text-secondary);">...</span>';
      renderPlaylist();
  } else if (viewName === 'favorites') { 
      currentTab = 'favorites'; currentPlaylistId = null; viewSongs.style.display = 'flex'; 
      document.querySelectorAll('.tab-btn-main').forEach(b => b.classList.remove('active')); document.querySelector('.tab-btn-main[data-view="favorites"]').classList.add('active'); 
      if(listTitle) listTitle.innerHTML = 'Favoritos <span id="trackCount" style="font-weight:400;font-size:11px;color:var(--text-secondary);">...</span>';
      renderPlaylist();
  } else if (viewName === 'playlists') { 
      currentTab = 'playlists'; currentPlaylistId = null; viewPlaylists.style.display = 'flex'; 
      document.querySelectorAll('.tab-btn-main').forEach(b => b.classList.remove('active')); document.querySelector('.tab-btn-main[data-view="playlists"]').classList.add('active'); 
      renderPlaylistsList(); 
  } else if (viewName === 'playlist-detail') { 
      currentTab = 'playlist-detail'; viewPlaylistDetail.style.display = 'flex'; mainTabs.style.display = 'none'; 
  }
}
document.querySelectorAll('.tab-btn-main').forEach(btn => { btn.addEventListener('click', (e) => showView(e.target.dataset.view)); });

function renderPlaylist() {
  if (!playlistEl) return;
  let displayTracks = tracks.filter(t => !t.hidden);
  if (currentTab === 'favorites') displayTracks = displayTracks.filter(t => t.isFavorite);
  if (currentSearchQuery) displayTracks = displayTracks.filter(t => t.name.toLowerCase().includes(currentSearchQuery) || (t.artist && t.artist.toLowerCase().includes(currentSearchQuery)));

  const tc = $('trackCount'); if (tc) tc.textContent = `${displayTracks.length} pistas`;
  
  if (displayTracks.length === 0) { 
      playlistEl.innerHTML = `<li style="justify-content:center;color:var(--text-secondary);">No hay música ${currentSearchQuery ? 'que coincida' : ''}.</li>`; return; 
  }

  playlistEl.innerHTML = displayTracks.map((t) => {
    let displayCover = t.cover && window.Capacitor?.convertFileSrc ? window.Capacitor.convertFileSrc(t.cover) : '';
    const realIndex = tracks.findIndex(x => x.url === t.url);
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

function updatePlaylistHighlight() {
  if (playlistEl) { playlistEl.querySelectorAll('li').forEach((li) => { const idx = parseInt(li.dataset.index); li.classList.toggle('active', idx === currentIndex); }); }
  if (playlistDetailList && currentPlaylistId !== null) { playlistDetailList.querySelectorAll('li').forEach((li) => { const idx = parseInt(li.dataset.index); li.classList.toggle('active', idx === currentIndex); }); }
}

async function escanearMusicaNativa() {
  const MediaStorePlugin = window.Capacitor?.Plugins?.CapacitorMediaStore;
  if (!window.Capacitor || !MediaStorePlugin) return;
  try {
    if (tracks.length === 0) { if (playlistEl) playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Buscando...</li>'; }
    await MediaStorePlugin.requestPermissions({ types: ['audio'] });
    const result = await MediaStorePlugin.getMediasByType({ mediaType: 'audio', sortBy: 'TITLE', includeExternal: true });
    const listaAudios = result.media || result.medias || [];
    
    if (listaAudios.length > 0) {
      const newTracks = listaAudios.map(song => ({
        name: song.title || song.name || 'Desconocido', artist: song.artist || 'Artista desconocido',
        url: song.url || song.uri || song.path, cover: song.albumArt || song.albumArtUri || song.cover || '',
        dateAdded: song.dateAdded || song.date_added || song.dateModified || song.id || 0,
        duration: song.duration || song.durationMs || 0, hidden: false, isFavorite: false
      })).filter(t => {
        if (!t.url) return false;
        const duracionSegundos = t.duration > 1000 ? t.duration / 1000 : t.duration;
        if (duracionSegundos > 0 && duracionSegundos < 60) return false; 
        const urlMinuscula = t.url.toLowerCase();
        const carpetasBasura = ['/whatsapp/', '/telegram/', '/android/media/com.whatsapp/', '/android/media/org.telegram.messenger/', '/notifications/', '/ringtones/', '/alarms/', '/ui/' ];
        if (carpetasBasura.some(carpeta => urlMinuscula.includes(carpeta))) return false;
        const nombreMinuscula = t.name.toLowerCase();
        if (nombreMinuscula.startsWith('ptt-') || nombreMinuscula.includes('whatsapp audio')) return false;
        return true;
      });

      if (newTracks.length > 0) {
        const hiddenUrls = tracks.filter(t => t.hidden).map(t => t.url);
        const favUrls = tracks.filter(t => t.isFavorite).map(t => t.url);
        tracks = newTracks.map(t => ({ ...t, hidden: hiddenUrls.includes(t.url), isFavorite: favUrls.includes(t.url) }));
        saveTracksCache(); sortTracks('newest'); restaurarSesion();
      } else if (tracks.length === 0) { if (playlistEl) playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">No se encontró música.</li>'; }
    } else if (tracks.length === 0) { if (playlistEl) playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">No se encontró música.</li>'; }
  } catch (error) {}
}

function sortTracks(criteria) {
  const currentTrackUrl = currentIndex !== -1 && tracks[currentIndex] ? tracks[currentIndex].url : null;
  if (criteria === 'newest') tracks.sort((a, b) => b.dateAdded - a.dateAdded);
  else if (criteria === 'oldest') tracks.sort((a, b) => a.dateAdded - b.dateAdded);
  else if (criteria === 'title') tracks.sort((a, b) => a.name.localeCompare(b.name));
  if (currentTrackUrl) currentIndex = tracks.findIndex(t => t.url === currentTrackUrl);
  renderPlaylist(); closeMenu();
}

function loadPlaylists() { const saved = localStorage.getItem('ymPlay_playlists'); if (saved) playlists = JSON.parse(saved); }
function savePlaylists() { localStorage.setItem('ymPlay_playlists', JSON.stringify(playlists)); }

function renderPlaylistsList() {
  playlistsListEl.innerHTML = '';
  if (playlists.length === 0) { playlistsListEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">No tienes playlists.</li>'; return; }
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
  let songsInPlaylist = tracks.filter(t => pl.songs.includes(t.url) && !t.hidden);
  if (currentSearchQuery) songsInPlaylist = songsInPlaylist.filter(t => t.name.toLowerCase().includes(currentSearchQuery) || (t.artist && t.artist.toLowerCase().includes(currentSearchQuery)));
  if (songsInPlaylist.length === 0) { playlistDetailList.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Playlist vacía.</li>'; return; }
  
  playlistDetailList.innerHTML = songsInPlaylist.map((t) => {
    let displayCover = t.cover && window.Capacitor?.convertFileSrc ? window.Capacitor.convertFileSrc(t.cover) : '';
    const realIndex = tracks.findIndex(x => x.url === t.url);
    return `<li data-index="${realIndex}" class="${realIndex === currentIndex ? 'active' : ''}"><div style="display:flex; align-items:center; gap:12px; width: 100%;">${displayCover ? `<img src="${displayCover}" style="width:45px;height:45px;border-radius:8px;object-fit:cover;">` : '<div style="width:45px;height:45px;background:var(--bg-card-solid);border-radius:8px;display:flex;align-items:center;justify-content:center;">🎵</div>'}<div style="display:flex; flex-direction:column; overflow: hidden; text-align: left;"><span style="font-weight:600; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.name}</span><span class="pl-artist" style="font-size:12px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.artist}</span></div></div></li>`;
  }).join('');
  playlistDetailList.querySelectorAll('li').forEach(li => { const idx = parseInt(li.dataset.index); li.addEventListener('click', () => { if (idx !== currentIndex) cargarCancion(idx); abrirReproductor(); }); });
}

function renderHiddenSongs() {
    const hiddenList = $('hidden-songs-list');
    if (!hiddenList) return;
    const hiddenTracks = tracks.filter(t => t.hidden);
    if (hiddenTracks.length === 0) { hiddenList.innerHTML = '<li style="justify-content:center;color:var(--text-secondary); font-size: 13px;">No hay canciones ocultas.</li>'; return; }
    hiddenList.innerHTML = hiddenTracks.map(t => `<li style="display:flex; justify-content:space-between; align-items:center;"><span style="font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:70%;">${t.name}</span><button class="btn-secondary" style="color:var(--accent); padding:4px 8px;" onclick="restaurarCancion('${t.url}')">Restaurar</button></li>`).join('');
}

window.restaurarCancion = function(url) {
    const track = tracks.find(t => t.url === url);
    if (track) { track.hidden = false; saveTracksCache(); renderHiddenSongs(); renderPlaylist(); }
};

if($('openSettingsBtn')) $('openSettingsBtn').addEventListener('click', () => { closeMenu(); screenMain.style.display = 'none'; screenPlayer.style.display = 'none'; screenSettings.style.display = 'flex'; updateStatsUI(); renderHiddenSongs(); });
if($('closeSettingsBtn')) $('closeSettingsBtn').addEventListener('click', () => { screenSettings.style.display = 'none'; screenMain.style.display = 'flex'; });
if($('toggleAudioFocus')) {
    $('toggleAudioFocus').checked = localStorage.getItem('ymPlay_audioFocus') === 'true';
    $('toggleAudioFocus').addEventListener('change', (e) => { localStorage.setItem('ymPlay_audioFocus', e.target.checked); });
}

document.querySelectorAll('.color-option:not(.custom-color-picker)').forEach(btn => {
    btn.addEventListener('click', () => {
        const colorHex = btn.dataset.color;
        document.querySelectorAll('.color-option').forEach(d => d.classList.remove('active'));
        btn.classList.add('active');
        const r = parseInt(colorHex.slice(1,3), 16); const g = parseInt(colorHex.slice(3,5), 16); const b = parseInt(colorHex.slice(5,7), 16);
        document.documentElement.style.setProperty('--accent', colorHex);
        document.documentElement.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.4)`);
        localStorage.setItem('ymPlay_manualTheme', colorHex);
    });
});
if($('customColorPicker')) {
    $('customColorPicker').addEventListener('input', (e) => {
        const colorHex = e.target.value;
        document.querySelectorAll('.color-option').forEach(d => d.classList.remove('active'));
        document.querySelector('.custom-color-picker').style.background = colorHex;
        document.querySelector('.custom-color-picker').classList.add('active');
        const r = parseInt(colorHex.slice(1,3), 16); const g = parseInt(colorHex.slice(3,5), 16); const b = parseInt(colorHex.slice(5,7), 16);
        document.documentElement.style.setProperty('--accent', colorHex);
        document.documentElement.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.4)`);
        localStorage.setItem('ymPlay_manualTheme', colorHex);
    });
}

if(backToPlaylistsBtn) backToPlaylistsBtn.addEventListener('click', () => { showView('playlists'); renderPlaylistsList(); });
if(btnNewPlaylist) btnNewPlaylist.addEventListener('click', () => { newPlaylistName.value = ''; modalNewPlaylist.style.display = 'flex'; });
if(cancelNewPlaylist) cancelNewPlaylist.addEventListener('click', () => modalNewPlaylist.style.display = 'none');
if(saveNewPlaylist) saveNewPlaylist.addEventListener('click', () => {
  const name = newPlaylistName.value.trim();
  if (name) { playlists.push({ id: Date.now().toString(), name: name, songs: [] }); savePlaylists(); modalNewPlaylist.style.display = 'none'; renderPlaylistsList(); }
});

if(btnAddSongsToPlaylist) btnAddSongsToPlaylist.addEventListener('click', () => {
  const pl = playlists.find(p => p.id === currentPlaylistId); if (!pl) return;
  allSongsOptions.innerHTML = '';
  tracks.filter(t => !t.hidden).forEach(t => {
    const isAdded = pl.songs.includes(t.url);
    const li = document.createElement('li');
    li.style.display = 'flex'; li.style.justifyContent = 'space-between'; li.style.alignItems = 'center';
    let displayCover = t.cover && window.Capacitor?.convertFileSrc ? window.Capacitor.convertFileSrc(t.cover) : '';
    const imgHtml = displayCover ? `<img src="${displayCover}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;">` : `<div style="width:40px;height:40px;background:var(--bg-card-solid);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:16px;">🎵</div>`;
    li.innerHTML = `<div style="display:flex; align-items:center; gap:10px; flex:1; overflow:hidden;">${imgHtml}<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:14px; font-weight:500;">${t.name}</span></div><span style="font-size:20px; padding-left: 10px; color:${isAdded ? 'var(--accent)' : 'var(--text-secondary)'}">${isAdded ? '✓' : '+'}</span>`;
    li.addEventListener('click', () => {
      const index = pl.songs.indexOf(t.url); const iconSpan = li.querySelector('span:last-child');
      if (index === -1) { pl.songs.push(t.url); iconSpan.textContent = '✓'; iconSpan.style.color = 'var(--accent)'; } 
      else { pl.songs.splice(index, 1); iconSpan.textContent = '+'; iconSpan.style.color = 'var(--text-secondary)'; }
      savePlaylists();
    });
    allSongsOptions.appendChild(li);
  });
  modalSelectSongs.style.display = 'flex';
});
if(closeAddSongsModal) closeAddSongsModal.addEventListener('click', () => { modalSelectSongs.style.display = 'none'; renderPlaylistDetail(); });

function showSelectionMenu(track) { selectedTrackObj = track; selectionMenu.classList.add('show'); sheetOverlay.classList.add('active'); }
function hideSelectionMenu() { selectionMenu.classList.remove('show'); sheetOverlay.classList.remove('active'); selectedTrackObj = null; }
function startPress(track) { pressTimer = setTimeout(() => { showSelectionMenu(track); }, 600); }
function cancelPress() { clearTimeout(pressTimer); }

if(closeSelectionBtn) closeSelectionBtn.addEventListener('click', hideSelectionMenu);
if(sheetOverlay) sheetOverlay.addEventListener('click', hideSelectionMenu);
if(ctxAddTo) ctxAddTo.addEventListener('click', () => {
  if (!selectedTrackObj) return; ctxPlaylistOptions.innerHTML = '';
  if (playlists.length === 0) { alert("Primero crea una Playlist."); hideSelectionMenu(); return; }
  playlists.forEach(pl => {
    const li = document.createElement('li'); li.innerHTML = `<span>${pl.name}</span> <span>+</span>`;
    li.addEventListener('click', () => {
      if (!pl.songs.includes(selectedTrackObj.url)) { pl.songs.push(selectedTrackObj.url); savePlaylists(); alert(`Añadida a ${pl.name}`); } 
      else { alert("Ya está en esta lista."); }
      modalCtxPlaylists.style.display = 'none'; hideSelectionMenu();
    });
    ctxPlaylistOptions.appendChild(li);
  });
  modalCtxPlaylists.style.display = 'flex';
});
if(cancelCtxPlaylist) cancelCtxPlaylist.addEventListener('click', () => modalCtxPlaylists.style.display = 'none');
if(ctxPlayNext) ctxPlayNext.addEventListener('click', () => {
  if (!selectedTrackObj) return;
  const idx = tracks.findIndex(t => t.url === selectedTrackObj.url);
  if (idx > -1 && currentIndex > -1) { const trackToMove = tracks.splice(idx, 1)[0]; tracks.splice(currentIndex + 1, 0, trackToMove); saveTracksCache(); renderPlaylist(); }
  hideSelectionMenu();
});
if(ctxHide) ctxHide.addEventListener('click', () => {
  if (!selectedTrackObj) return; const track = tracks.find(t => t.url === selectedTrackObj.url);
  if (track) track.hidden = true; saveTracksCache(); renderPlaylist(); hideSelectionMenu();
});
if(ctxDelete) ctxDelete.addEventListener('click', () => {
  if (!selectedTrackObj) return;
  if (confirm("¿Quitar de la app permanentemente?")) {
    tracks = tracks.filter(t => t.url !== selectedTrackObj.url); saveTracksCache();
    if (currentIndex > -1 && tracks[currentIndex] && tracks[currentIndex].url === selectedTrackObj.url) { audio.pause(); miniPlayer.style.display = 'none'; }
    renderPlaylist(); hideSelectionMenu();
  } else { hideSelectionMenu(); }
});

function abrirReproductor() { if(screenMain) screenMain.style.display = 'none'; if(screenPlayer) screenPlayer.style.display = 'flex'; }
function volverALista() { 
  if(screenPlayer) screenPlayer.style.display = 'none'; if(screenMain) screenMain.style.display = 'flex'; 
  if (currentPlaylistId !== null) { viewSongs.style.display = 'none'; viewPlaylists.style.display = 'none'; viewPlaylistDetail.style.display = 'flex'; mainTabs.style.display = 'none'; renderPlaylistDetail(); } 
  else { showView(currentTab || 'songs'); }
}
function resetProgress() { if(progressFill) progressFill.style.width = '0%'; if(currentTimeEl) currentTimeEl.textContent = '0:00'; }
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
if (miniPlayBtn) miniPlayBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePlay(); });
if (miniPrevBtn) miniPrevBtn.addEventListener('click', (e) => { e.stopPropagation(); prevTrack(); });
if (miniNextBtn) miniNextBtn.addEventListener('click', (e) => { e.stopPropagation(); nextTrack(); });
if (miniInfoBtn) miniInfoBtn.addEventListener('click', abrirReproductor);
if (miniCover) miniCover.addEventListener('click', abrirReproductor);

function openMenu() { if(sideMenu) sideMenu.classList.add('open'); if(menuOverlay) menuOverlay.classList.add('active'); }
function closeMenu() { if(sideMenu) sideMenu.classList.remove('open'); if(menuOverlay) menuOverlay.classList.remove('active'); }

if (progressBar) {
  progressBar.addEventListener('click', e => {
    if (!audio.duration) return;
    const rect = progressBar.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
  });
}

const themeBtn = document.getElementById('themeToggle');
if (themeBtn) { themeBtn.addEventListener('click', () => { const html = document.documentElement; html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); }); }

function setupBackButton() {
  const App = window.Capacitor?.Plugins?.App;
  if (App) {
    App.addListener('backButton', () => {
      if (sideMenu && sideMenu.classList.contains('open')) { closeMenu(); return; }
      if (selectionMenu && selectionMenu.classList.contains('show')) { hideSelectionMenu(); return; }
      if (modalSelectSongs.style.display === 'flex' || modalNewPlaylist.style.display === 'flex' || modalCtxPlaylists.style.display === 'flex' || modalLyrics.style.display === 'flex') {
        modalSelectSongs.style.display = 'none'; modalNewPlaylist.style.display = 'none'; modalCtxPlaylists.style.display = 'none'; modalLyrics.style.display = 'none'; return;
      }
      if (screenSettings && screenSettings.style.display === 'flex') { $('closeSettingsBtn').click(); return; }
      if (screenPlayer && screenPlayer.style.display === 'flex') { volverALista(); return; }
      if (viewPlaylistDetail && viewPlaylistDetail.style.display === 'flex') { currentPlaylistId = null; showView('playlists'); return; }
      if (currentTab === 'favorites' || currentTab === 'playlists') { showView('songs'); return; }
      App.exitApp();
    });
  }
}

function isNewerVersion(serverVersion, currentVersion) {
    const serverParts = serverVersion.split('.').map(Number);
    const currentParts = currentVersion.split('.').map(Number);
    for (let i = 0; i < Math.max(serverParts.length, currentParts.length); i++) {
        const s = serverParts[i] || 0; const c = currentParts[i] || 0;
        if (s > c) return true;
        if (s < c) return false;
    }
    return false;
}

async function checkForUpdates() {
  try {
    const response = await fetch(UPDATE_JSON_URL + '?t=' + new Date().getTime());
    const data = await response.json();
    if (isNewerVersion(data.version, CURRENT_APP_VERSION)) {
      const banner = $('update-banner');
      if (banner) {
        banner.classList.add('show');
        $('downloadUpdateBtn').onclick = () => { window.open(UPDATE_DOWNLOAD_URL, '_blank'); };
        $('closeUpdateBtn').onclick = () => { banner.classList.remove('show'); };
      }
    }
  } catch (error) {}
}

document.addEventListener('DOMContentLoaded', () => {
  loadPlaylists(); 
  loadCachedTracks();
  
  const savedOpacity = localStorage.getItem('ymPlay_uiOpacity');
  if (savedOpacity) { uiOpacitySlider.value = savedOpacity; document.documentElement.style.setProperty('--ui-transparency', savedOpacity); } 
  else { uiOpacitySlider.value = 0.2; document.documentElement.style.setProperty('--ui-transparency', 0.2); }

  const savedThemeColor = localStorage.getItem('ymPlay_manualTheme');
  if (savedThemeColor) {
      const r = parseInt(savedThemeColor.slice(1,3), 16); const g = parseInt(savedThemeColor.slice(3,5), 16); const b = parseInt(savedThemeColor.slice(5,7), 16);
      document.documentElement.style.setProperty('--accent', savedThemeColor);
      document.documentElement.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.4)`);
      const matchBtn = document.querySelector(`.color-option[data-color="${savedThemeColor}"]`);
      if (matchBtn) matchBtn.classList.add('active');
      else { const customBtn = document.querySelector('.custom-color-picker'); if(customBtn) { customBtn.style.background = savedThemeColor; customBtn.classList.add('active'); } }
  }

  const savedBg = localStorage.getItem('ymPlay_customBg'); 
  const savedBlur = localStorage.getItem('ymPlay_bgBlur') || 0; 
  if (savedBg) { 
      if (bgBlurSlider) bgBlurSlider.value = savedBlur; 
      applyBackground(savedBg, savedBlur); 
      if (!savedThemeColor) extraerColorDominante(savedBg);
  } else {
      applyBackground('default-bg.jpg', 0);
  }
  
  setTimeout(() => { escanearMusicaNativa(); }, 1000);
  checkForUpdates();
  setupBackButton();
  updateStatsUI();
});
