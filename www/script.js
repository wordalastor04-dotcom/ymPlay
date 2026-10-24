// ============================================================
// 1. CONFIGURACIÓN E IMPORTACIÓN DEL PLUGIN NATIVO
// ============================================================
const audio = new Audio();
let tracks = [];
let currentIndex = -1;
let isPlaying = false;
let lyricsData = [];

// Detectar si estamos en la app Android (Capacitor)
const isCapacitor = window.Capacitor !== undefined;
let MediaStore = null;
if (isCapacitor) {
  MediaStore = window.Capacitor.Plugins.MediaStore;
}

// Web Audio API para ecualizador
let audioCtx = null;
let sourceNode = null;
let eqFilters = [];
const EQ_FREQS = [60, 250, 1000, 4000, 14000];

// ============================================================
// 2. REFERENCIAS DOM (Pantallas, Lista y Reproductor)
// ============================================================
const $ = id => document.getElementById(id);

// Pantallas
const screenPlaylist = $('screen-playlist');
const screenPlayer = $('screen-player');

// Elementos de la lista
const playlistEl = $('playlist');
const trackCount = $('trackCount');
const btnEscanear = $('btnEscanear');

// Elementos del reproductor
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
const lyricsBox = $('lyricsBox');

// ============================================================
// 3. ESCANEO NATIVO DE MÚSICA (MediaStore)
// ============================================================
async function escanearMusicaNativa() {
  if (!isCapacitor || !MediaStore) {
    console.warn("MediaStore no disponible. Estás en el navegador web.");
    playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Escaneo automático solo disponible en el APK.</li>';
    return;
  }

  try {
    playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Buscando música...</li>';
    
    // Pedir audios al sistema Android
    const result = await MediaStore.getMedias({ mediaType: 'audio' });
    const listaAudios = result.medias || result.files || result.audios || [];

    if (listaAudios.length > 0) {
      tracks = listaAudios.map(song => {
        return {
          name: song.title || song.name || 'Desconocido',
          artist: song.artist || 'Artista desconocido',
          url: song.url || song.uri, // Ruta local del archivo
          cover: song.albumArt || song.albumArtUri || '', // Portada
        };
      }).filter(t => t.url); // Filtrar los que no tengan ruta válida
      
      renderPlaylist();
    } else {
      playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">No se encontró música.</li>';
    }
  } catch (error) {
    console.error("Error al escanear:", error);
    playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Error al leer archivos. Revisa permisos.</li>';
  }
}

// ============================================================
// 4. RENDERIZAR LA LISTA Y NAVEGACIÓN
// ============================================================
function renderPlaylist() {
  if (trackCount) trackCount.textContent = `${tracks.length} pista${tracks.length !== 1 ? 's' : ''}`;
  
  if (tracks.length === 0) {
    playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Añade música para empezar</li>';
    return;
  }

  playlistEl.innerHTML = tracks.map((t, i) => `
    <li data-index="${i}" class="${i === currentIndex ? 'active' : ''}">
      <div style="display:flex; align-items:center; gap:12px; width: 100%;">
        ${t.cover ? `<img src="${t.cover}" style="width:45px;height:45px;border-radius:8px;object-fit:cover;">` : '<div style="width:45px;height:45px;background:var(--bg-card-solid);border-radius:8px;display:flex;align-items:center;justify-content:center;">🎵</div>'}
        <div style="display:flex; flex-direction:column; overflow: hidden; text-align: left;">
            <span style="font-weight:600; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.name}</span>
            <span class="pl-artist" style="font-size:12px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.artist}</span>
        </div>
      </div>
    </li>
  `).join('');

  // Al tocar una canción, se carga y se abre el reproductor
  playlistEl.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      const idx = parseInt(li.dataset.index);
      cargarCancion(idx);
      abrirReproductor();
    });
  });
}

function abrirReproductor() {
  if(screenPlaylist) screenPlaylist.style.display = 'none';
  if(screenPlayer) screenPlayer.style.display = 'flex';
}

function volverALista() {
  if(screenPlayer) screenPlayer.style.display = 'none';
  if(screenPlaylist) screenPlaylist.style.display = 'flex';
  // Refrescar la lista por si cambió la canción activa
  renderPlaylist();
}

// ============================================================
// 5. LÓGICA DEL REPRODUCTOR
// ============================================================
function cargarCancion(index) {
  if (index < 0 || index >= tracks.length) return;
  currentIndex = index;
  const track = tracks[index];

  audio.src = track.url;
  songTitle.textContent = track.name;
  songArtist.textContent = track.artist;
  
  if (coverBadge) coverBadge.textContent = `Pista ${index + 1} de ${tracks.length}`;

  if (track.cover) {
    coverImg.src = track.cover;
    coverImg.style.display = 'block';
  } else {
    coverImg.style.display = 'none';
  }

  updatePlaylistHighlight();
  resetProgress();
  setupAudioContext(); // Preparar el ecualizador
  playAudio(); // Iniciar reproducción automáticamente
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

function updatePlaylistHighlight() {
  playlistEl.querySelectorAll('li').forEach((li, i) => {
    li.classList.toggle('active', i === currentIndex);
  });
}

function resetProgress() {
  if(progressFill) progressFill.style.width = '0%';
  if(currentTimeEl) currentTimeEl.textContent = '0:00';
  if(totalTimeEl) totalTimeEl.textContent = '0:00';
}

// ============================================================
// 6. EVENTOS DE AUDIO Y PROGRESO
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
  isPlaying = true;
  if(playIcon) playIcon.innerHTML = '<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>';
});

audio.addEventListener('pause', () => {
  isPlaying = false;
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

// ============================================================
// 7. ECUALIZADOR Y AUDIO CONTEXT
// ============================================================
function setupAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (sourceNode) {
    try { sourceNode.disconnect(); } catch (e) {}
    sourceNode = null;
  }
  try {
    sourceNode = audioCtx.createMediaElementSource(audio);
  } catch (e) { return; }

  if (eqFilters.length === 0) {
    eqFilters = EQ_FREQS.map((freq) => {
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1;
      filter.gain.value = 0;
      return filter;
    });
  }

  let prev = sourceNode;
  eqFilters.forEach(filter => {
    prev.connect(filter);
    prev = filter;
  });
  prev.connect(audioCtx.destination);
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
// 8. PESTAÑAS (LETRAS / ECUALIZADOR)
// ============================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// ============================================================
// 9. TEMAS Y FONDO (Opcional)
// ============================================================
document.querySelectorAll('.palette-dot').forEach(dot => {
  dot.addEventListener('click', () => {
    document.querySelectorAll('.palette-dot').forEach(d => d.classList.remove('active'));
    dot.classList.add('active');
    document.documentElement.setAttribute('data-palette', dot.dataset.color);
  });
});

$('themeToggle')?.addEventListener('click', () => {
  const html = document.documentElement;
  html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

// ============================================================
// 10. UTILIDADES E INICIALIZACIÓN
// ============================================================
function formatTime(sec) {
  if (isNaN(sec) || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Botones principales
if(playBtn) playBtn.addEventListener('click', togglePlay);
if(prevBtn) prevBtn.addEventListener('click', prevTrack);
if(nextBtn) nextBtn.addEventListener('click', nextTrack);
if(backToListBtn) backToListBtn.addEventListener('click', volverALista);

// Botón de "Actualizar Música" en la lista
if(btnEscanear) {
  btnEscanear.addEventListener('click', (e) => {
    e.preventDefault(); // Evita que se abra el input file
    escanearMusicaNativa();
  });
}

// Arrancar la app
document.addEventListener('DOMContentLoaded', () => {
  // Esperar 1.5 segundos para que cargue la UI y Android pida los permisos
  setTimeout(() => {
    escanearMusicaNativa();
  }, 1500);
});
