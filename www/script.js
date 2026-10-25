const audio = new Audio();
audio.crossOrigin = "anonymous";
let tracks = [];
let currentIndex = -1;

let audioCtx = null;
let sourceNode = null;
let eqFilters = [];
const EQ_FREQS = [60, 250, 1000, 4000, 14000];

// ⚠️ IMPORTANTE: Cambia este número cuando compiles un nuevo APK
const CURRENT_APP_VERSION = "1.0.0";
const UPDATE_JSON_URL = "https://wordalastor04-dotcom.github.io/ymPlay/version.json";
const UPDATE_DOWNLOAD_URL = "https://github.com/wordalastor04-dotcom/ymPlay/releases/latest";

const $ = id => document.getElementById(id);
const screenPlaylist = $('screen-playlist');
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

const miniPlayer = $('mini-player');
const miniCover = $('miniCover');
const miniTitle = $('miniTitle');
const miniArtist = $('miniArtist');
const miniPlayBtn = $('miniPlayBtn');
const miniNextBtn = $('miniNextBtn');
const miniInfoBtn = $('miniInfoBtn');

const menuBtn = $('menuBtn');
const sideMenu = $('side-menu');
const menuOverlay = $('menu-overlay');
const closeMenuBtn = $('closeMenuBtn');
const sortNewestBtn = $('sortNewestBtn');
const sortOldestBtn = $('sortOldestBtn');
const sortTitleBtn = $('sortTitleBtn');

// BANNER DE ACTUALIZACIÓN
const updateBanner = $('update-banner');
const downloadUpdateBtn = $('downloadUpdateBtn');
const closeUpdateBtn = $('closeUpdateBtn');

async function checkForUpdates() {
  try {
    const response = await fetch(UPDATE_JSON_URL);
    const data = await response.json();
    
    // Si la versión en internet es diferente a la de esta app
    if (data.version !== CURRENT_APP_VERSION) {
      if (updateBanner) {
        // Le ponemos el enlace de descarga al botón
        downloadUpdateBtn.onclick = () => window.open(data.url || UPDATE_DOWNLOAD_URL, '_system');
        updateBanner.classList.add('show');
      }
    }
  } catch (e) {
    console.log("No se pudo comprobar la actualización");
  }
}

if (closeUpdateBtn) {
  closeUpdateBtn.onclick = () => {
    updateBanner.classList.remove('show');
  };
}

// ESCANEO
async function escanearMusicaNativa() {
  const MediaStorePlugin = window.Capacitor?.Plugins?.CapacitorMediaStore;
  if (!window.Capacitor || !MediaStorePlugin) {
    if (playlistEl) playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Escaneo solo disponible en el APK.</li>';
    return;
  }
  try {
    if (playlistEl) playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Buscando música...</li>';
    await MediaStorePlugin.requestPermissions({ types: ['audio'] });
    const result = await MediaStorePlugin.getMediasByType({ mediaType: 'audio', sortBy: 'TITLE', includeExternal: true });
    const listaAudios = result.media || result.medias || [];
    if (listaAudios.length > 0) {
      tracks = listaAudios.map(song => ({
        name: song.title || song.name || 'Desconocido',
        artist: song.artist || 'Artista desconocido',
        url: song.url || song.uri || song.path,
        cover: song.albumArt || song.albumArtUri || song.cover || '',
        dateAdded: song.dateAdded || song.date_added || song.dateModified || song.id || 0
      })).filter(t => t.url);
      sortTracks('newest');
    } else {
      if (playlistEl) playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">No se encontró música.</li>';
    }
  } catch (error) {
    if (playlistEl) playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Error al leer archivos.</li>';
  }
}

// LISTA
function renderPlaylist() {
  if (!playlistEl) return;
  if (trackCount) trackCount.textContent = `${tracks.length} pistas`;
  if (tracks.length === 0) {
    playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">No hay música</li>';
    return;
  }
  playlistEl.innerHTML = tracks.map((t, i) => {
    let displayCover = t.cover && window.Capacitor?.convertFileSrc ? window.Capacitor.convertFileSrc(t.cover) : '';
    return `
    <li data-index="${i}" class="${i === currentIndex ? 'active' : ''}">
      <div style="display:flex; align-items:center; gap:12px; width: 100%;">
        ${displayCover ? `<img src="${displayCover}" style="width:45px;height:45px;border-radius:8px;object-fit:cover;">` : '<div style="width:45px;height:45px;background:var(--bg-card-solid);border-radius:8px;display:flex;align-items:center;justify-content:center;">🎵</div>'}
        <div style="display:flex; flex-direction:column; overflow: hidden; text-align: left;">
            <span style="font-weight:600; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.name}</span>
            <span class="pl-artist" style="font-size:12px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.artist}</span>
        </div>
      </div>
    </li>`;
  }).join('');

  playlistEl.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      const idx = parseInt(li.dataset.index);
      if (idx !== currentIndex) cargarCancion(idx);
      abrirReproductor();
    });
  });
}

// MENÚ Y ORDEN
function sortTracks(criteria) {
  const currentTrackUrl = currentIndex !== -1 && tracks[currentIndex] ? tracks[currentIndex].url : null;
  if (criteria === 'newest') tracks.sort((a, b) => b.dateAdded - a.dateAdded);
  else if (criteria === 'oldest') tracks.sort((a, b) => a.dateAdded - b.dateAdded);
  else if (criteria === 'title') tracks.sort((a, b) => a.name.localeCompare(b.name));
  if (currentTrackUrl) currentIndex = tracks.findIndex(t => t.url === currentTrackUrl);
  renderPlaylist();
  closeMenu();
}

function openMenu() { if(sideMenu) sideMenu.classList.add('open'); if(menuOverlay) menuOverlay.classList.add('active'); }
function closeMenu() { if(sideMenu) sideMenu.classList.remove('open'); if(menuOverlay) menuOverlay.classList.remove('active'); }

// REPRODUCTOR
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

  if (miniPlayer) {
    miniPlayer.style.display = 'flex';
    miniTitle.textContent = track.name;
    miniArtist.textContent = track.artist;
    if (coverUrl) {
      miniCover.src = coverUrl;
      miniCover.style.display = 'block';
    } else {
      miniCover.style.display = 'none';
    }
  }

  updateMediaSession(track, coverUrl);
  resetProgress();
  playAudio();
}

function updateMediaSession(track, coverUrl) {
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
  if(miniPlayBtn) miniPlayBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>';
  setupAudioContext();
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
});
audio.addEventListener('pause', () => { 
  if(playIcon) playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>'; 
  if(miniPlayBtn) miniPlayBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
});
audio.addEventListener('ended', nextTrack);

if (progressBar) {
  progressBar.addEventListener('click', e => {
    if (!audio.duration) return;
    const rect = progressBar.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
  });
}

function setupAudioContext() {
  if (sourceNode) return; 
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    sourceNode = audioCtx.createMediaElementSource(audio);
    eqFilters = EQ_FREQS.map(freq => {
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'peaking'; filter.frequency.value = freq; filter.Q.value = 1; filter.gain.value = 0;
      return filter;
    });
    let prev = sourceNode;
    eqFilters.forEach(f => { prev.connect(f); prev = f; });
    prev.connect(audioCtx.destination);
  } catch (e) {}
}

document.querySelectorAll('#eqSliders input[type="range"]').forEach((slider, i) => {
  slider.addEventListener('input', () => {
    if (eqFilters[i]) eqFilters[i].gain.value = parseFloat(slider.value);
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  });
});

document.getElementById('eqPresets')?.addEventListener('click', e => {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const gains = { flat: [0,0,0,0,0], rock: [5,3,-1,3,5], pop: [-1,2,4,2,-1], jazz: [3,1,-2,1,3], vocal: [-2,0,4,3,-1] }[btn.dataset.preset] || [0,0,0,0,0];
  document.querySelectorAll('#eqSliders input[type="range"]').forEach((slider, i) => {
    slider.value = gains[i];
    if (eqFilters[i]) eqFilters[i].gain.value = gains[i];
  });
});

function abrirReproductor() { if(screenPlaylist) screenPlaylist.style.display = 'none'; if(screenPlayer) screenPlayer.style.display = 'flex'; }
function volverALista() { if(screenPlayer) screenPlayer.style.display = 'none'; if(screenPlaylist) screenPlaylist.style.display = 'flex'; renderPlaylist(); }
function resetProgress() { if(progressFill) progressFill.style.width = '0%'; if(currentTimeEl) currentTimeEl.textContent = '0:00'; if(totalTimeEl) totalTimeEl.textContent = '0:00'; }
function formatTime(sec) { if (isNaN(sec) || !isFinite(sec)) return '0:00'; return `${Math.floor(sec/60)}:${Math.floor(sec%60).toString().padStart(2, '0')}`; }

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
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
if (miniNextBtn) miniNextBtn.addEventListener('click', (e) => { e.stopPropagation(); nextTrack(); });
if (miniInfoBtn) miniInfoBtn.addEventListener('click', abrirReproductor);
if (miniCover) miniCover.addEventListener('click', abrirReproductor);

// FONDO Y BLUR
function applyBackground(imageSrc, blurAmount) {
  if (!customBg) return;
  customBg.style.backgroundImage = `url(${imageSrc})`;
  customBg.style.filter = `blur(${blurAmount}px)`;
  document.body.classList.add('has-custom-bg');
}

if (bgInput) {
  bgInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Image = event.target.result;
        try {
          localStorage.setItem('ymPlay_customBg', base64Image);
          localStorage.setItem('ymPlay_bgBlur', '0');
          if (bgBlurSlider) bgBlurSlider.value = 0;
          applyBackground(base64Image, 0);
        } catch (err) {
          alert("La imagen es muy grande para guardarla. Intenta con una más pequeña.");
        }
      };
      reader.readAsDataURL(file);
    }
  });
}

if (bgBlurSlider) {
  bgBlurSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    localStorage.setItem('ymPlay_bgBlur', val);
    if (customBg) customBg.style.filter = `blur(${val}px)`;
  });
}

// TEMA Y PALETA
const themeBtn = document.getElementById('themeToggle');
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const html = document.documentElement;
    html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
}

document.querySelectorAll('.palette-dot').forEach(dot => {
  dot.addEventListener('click', () => {
    document.querySelectorAll('.palette-dot').forEach(d => d.classList.remove('active'));
    dot.classList.add('active');
    document.documentElement.setAttribute('data-palette', dot.dataset.color);
  });
});

// ARRANQUE
document.addEventListener('DOMContentLoaded', () => {
  // Cargar fondo
  const savedBg = localStorage.getItem('ymPlay_customBg');
  const savedBlur = localStorage.getItem('ymPlay_bgBlur') || 0;
  if (savedBg) {
    if (bgBlurSlider) bgBlurSlider.value = savedBlur;
    applyBackground(savedBg, savedBlur);
  }
  
  // Escanear música
  setTimeout(() => { escanearMusicaNativa(); }, 1500);
  
  // Comprobar actualizaciones
  checkForUpdates();
});
