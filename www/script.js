// ============================================================
// 1. CONFIGURACIÓN E IMPORTACIÓN DEL PLUGIN NATIVO
// ============================================================
const audio = new Audio();
audio.crossOrigin = "anonymous";
let tracks = [];
let currentIndex = -1;
let isPlaying = false;

let audioCtx = null;
let sourceNode = null;
let eqFilters = [];
const EQ_FREQS = [60, 250, 1000, 4000, 14000];

// ============================================================
// 2. REFERENCIAS DOM (Búsqueda segura de elementos)
// ============================================================
const $ = id => document.getElementById(id);

// Pantallas
const screenPlaylist = $('screen-playlist');
const screenPlayer = $('screen-player');

// Lista y reproductor
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

// Menú lateral
const menuBtn = $('menuBtn');
const sideMenu = $('side-menu');
const menuOverlay = $('menu-overlay');
const closeMenuBtn = $('closeMenuBtn');
const sortNewestBtn = $('sortNewestBtn');
const sortOldestBtn = $('sortOldestBtn');
const sortTitleBtn = $('sortTitleBtn');

// ============================================================
// 3. ESCANEO NATIVO DE MÚSICA
// ============================================================
async function escanearMusicaNativa() {
  const MediaStorePlugin = window.Capacitor?.Plugins?.CapacitorMediaStore;

  if (!window.Capacitor || !MediaStorePlugin) {
    if (playlistEl) playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Escaneo solo disponible en el APK.</li>';
    return;
  }

  try {
    if (playlistEl) playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Buscando música...</li>';
    await MediaStorePlugin.requestPermissions({ types: ['audio'] });

    const result = await MediaStorePlugin.getMediasByType({ 
      mediaType: 'audio', 
      sortBy: 'TITLE', 
      includeExternal: true
    });

    const listaAudios = result.media || result.medias || [];

    if (listaAudios.length > 0) {
      tracks = listaAudios.map(song => {
        return {
          name: song.title || song.name || 'Desconocido',
          artist: song.artist || 'Artista desconocido',
          url: song.url || song.uri || song.path,
          cover: song.albumArt || song.albumArtUri || song.cover || '',
          dateAdded: song.dateAdded || song.date_added || song.dateModified || song.id || 0
        };
      }).filter(t => t.url);
      
      // Por defecto, ordenamos por los más recientes
      sortTracks('newest');
    } else {
      if (playlistEl) playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">No se encontró música.</li>';
    }
  } catch (error) {
    console.error("Error al escanear:", error);
    if (playlistEl) playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Error al leer archivos.</li>';
  }
}

// ============================================================
// 4. RENDERIZAR LISTA (CON PORTADAS)
// ============================================================
function renderPlaylist() {
  if (!playlistEl) return;
  if (trackCount) trackCount.textContent = `${tracks.length} pistas`;
  
  if (tracks.length === 0) {
    playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">No hay música para mostrar</li>';
    return;
  }

  playlistEl.innerHTML = tracks.map((t, i) => {
    let displayCover = '';
    if (t.cover) {
      displayCover = window.Capacitor?.convertFileSrc ? window.Capacitor.convertFileSrc(t.cover) : t.cover;
    }

    return `
    <li data-index="${i}" class="${i === currentIndex ? 'active' : ''}">
      <div style="display:flex; align-items:center; gap:12px; width: 100%;">
        ${displayCover ? `<img src="${displayCover}" style="width:45px;height:45px;border-radius:8px;object-fit:cover;">` : '<div style="width:45px;height:45px;background:var(--bg-card-solid);border-radius:8px;display:flex;align-items:center;justify-content:center;">🎵</div>'}
        <div style="display:flex; flex-direction:column; overflow: hidden; text-align: left;">
            <span style="font-weight:600; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.name}</span>
            <span class="pl-artist" style="font-size:12px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.artist}</span>
        </div>
      </div>
    </li>
    `;
  }).join('');

  playlistEl.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      const idx = parseInt(li.dataset.index);
      cargarCancion(idx);
      abrirReproductor();
    });
  });
}

// ============================================================
// 5. LÓGICA DE ORDENAMIENTO Y MENÚ
// ============================================================
function sortTracks(criteria) {
  const currentTrackUrl = currentIndex !== -1 && tracks[currentIndex] ? tracks[currentIndex].url : null;

  if (criteria === 'newest') {
    tracks.sort((a, b) => b.dateAdded - a.dateAdded);
  } else if (criteria === 'oldest') {
    tracks.sort((a, b) => a.dateAdded - b.dateAdded);
  } else if (criteria === 'title') {
    tracks.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (currentTrackUrl) {
    currentIndex = tracks.findIndex(t => t.url === currentTrackUrl);
  }

  renderPlaylist();
  closeMenu();
}

function openMenu() {
  if(sideMenu) sideMenu.classList.add('open');
  if(menuOverlay) menuOverlay.classList.add('active');
}

function closeMenu() {
  if(sideMenu) sideMenu.classList.remove('open');
  if(menuOverlay) menuOverlay.classList.remove('active');
}

// ============================================================
// 6. REPRODUCTOR Y REPRODUCCIÓN DE AUDIO
// ============================================================
function cargarCancion(index) {
  if (index < 0 || index >= tracks.length) return;
  currentIndex = index;
  const track = tracks[index];

  const playableUrl = window.Capacitor?.convertFileSrc ? window.Capacitor.convertFileSrc(track.url) : track.url;
  audio.src = playableUrl;
  
  if(songTitle) songTitle.textContent = track.name;
  if(songArtist) songArtist.textContent = track.artist;
  if (coverBadge) coverBadge.textContent = `Pista ${index + 1} de ${tracks.length}`;

  if (track.cover && coverImg) {
    coverImg.src = window.Capacitor?.convertFileSrc ? window.Capacitor.convertFileSrc(track.cover) : track.cover;
    coverImg.style.display = 'block';
  } else if (coverImg) {
    coverImg.style.display = 'none';
  }

  resetProgress();
  playAudio();
}

function playAudio() {
  if (currentIndex === -1) return;
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  audio.play().catch(err => console.warn('Error al reproducir:', err));
}

function togglePlay() {
  if (audio.paused) playAudio();
  else audio.pause();
}

function prevTrack() {
  if (tracks.length === 0) return;
  const newIndex = currentIndex > 0 ? currentIndex - 1 : tracks.length - 1;
  cargarCancion(newIndex);
}

function nextTrack() {
  if (tracks.length === 0) return;
  const newIndex = currentIndex < tracks.length - 1 ? currentIndex + 1 : 0;
  cargarCancion(newIndex);
}

// ============================================================
// 7. EVENTOS DE AUDIO, PROGRESO Y ECUALIZADOR
// ============================================================
audio.addEventListener('loadedmetadata', () => {
  if(totalTimeEl) totalTimeEl.textContent = formatTime(audio.duration);
});

audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  if(progressFill) progressFill.style.width = `${pct}%`;
  if(currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
});

audio.addEventListener('play', () => {
  if(playIcon) playIcon.innerHTML = '<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>';
  setupAudioContext(); 
});

audio.addEventListener('pause', () => {
  if(playIcon) playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
});

audio.addEventListener('ended', nextTrack);

if (progressBar) {
  progressBar.addEventListener('click', e => {
    if (!audio.duration) return;
    const rect = progressBar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
  });
}

function setupAudioContext() {
  if (sourceNode) return; 
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    sourceNode = audioCtx.createMediaElementSource(audio);
    
    eqFilters = EQ_FREQS.map(freq => {
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'peaking'; 
      filter.frequency.value = freq; 
      filter.Q.value = 1; 
      filter.gain.value = 0;
      return filter;
    });

    let prev = sourceNode;
    eqFilters.forEach(f => { prev.connect(f); prev = f; });
    prev.connect(audioCtx.destination);
  } catch (e) {}
}

document.querySelectorAll('#eqSliders input[type="range"]').forEach((slider, i) => {
  slider.addEventListener('input', () => {
    const gain = parseFloat(slider.value);
    if (eqFilters[i]) eqFilters[i].gain.value = gain;
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  });
});

document.getElementById('eqPresets')?.addEventListener('click', e => {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;

  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const gains = {
    flat: [0, 0, 0, 0, 0], rock: [5, 3, -1, 3, 5], pop: [-1, 2, 4, 2, -1],
    jazz: [3, 1, -2, 1, 3], vocal: [-2, 0, 4, 3, -1]
  }[btn.dataset.preset] || [0, 0, 0, 0, 0];

  document.querySelectorAll('#eqSliders input[type="range"]').forEach((slider, i) => {
    slider.value = gains[i];
    if (eqFilters[i]) eqFilters[i].gain.value = gains[i];
  });
});

// ============================================================
// 8. NAVEGACIÓN, PESTAÑAS Y UTILIDADES
// ============================================================
function abrirReproductor() {
  if(screenPlaylist) screenPlaylist.style.display = 'none';
  if(screenPlayer) screenPlayer.style.display = 'flex';
}

function volverALista() {
  if(screenPlayer) screenPlayer.style.display = 'none';
  if(screenPlaylist) screenPlaylist.style.display = 'flex';
  renderPlaylist();
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

function resetProgress() {
  if(progressFill) progressFill.style.width = '0%';
  if(currentTimeEl) currentTimeEl.textContent = '0:00';
  if(totalTimeEl) totalTimeEl.textContent = '0:00';
}

function formatTime(sec) {
  if (isNaN(sec) || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ============================================================
// 9. ASIGNACIÓN DE EVENTOS (BOTONES)
// ============================================================
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

if(btnEscanear) {
  btnEscanear.addEventListener('click', (e) => {
    e.preventDefault(); 
    escanearMusicaNativa();
  });
}

// ============================================================
// 10. CAMBIO DE TEMA Y PALETA DE COLORES (¡El arreglo!)
// ============================================================
// Botón de Tema (Oscuro/Claro)
const themeBtn = document.getElementById('themeToggle');
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
  });
}

// Botones de Colores (Paleta)
document.querySelectorAll('.palette-dot').forEach(dot => {
  dot.addEventListener('click', () => {
    document.querySelectorAll('.palette-dot').forEach(d => d.classList.remove('active'));
    dot.classList.add('active');
    const color = dot.dataset.color;
    document.documentElement.setAttribute('data-palette', color);
  });
});

// ============================================================
// 11. ARRANQUE DE LA APP
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Retraso para permitir que Android solicite los permisos
  setTimeout(() => {
    escanearMusicaNativa();
  }, 1500);
});
