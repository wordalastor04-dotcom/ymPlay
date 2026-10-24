// ============================================================
// ESTADO GLOBAL Y CONFIGURACIÓN
// ============================================================
const audio = new Audio();
audio.crossOrigin = 'anonymous';

let tracks = [];
let currentIndex = -1;
let isPlaying = false;
let lyricsData = []; // [{time, text}]
let activeLyricIndex = -1;

// Web Audio API para ecualizador
let audioCtx = null;
let sourceNode = null;
let eqFilters = [];
const EQ_FREQS = [60, 250, 1000, 4000, 14000];

// ============================================================
// REFERENCIAS DOM
// ============================================================
const $ = id => document.getElementById(id);
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
const playlistEl = $('playlist');
const trackCount = $('trackCount');
const lyricsBox = $('lyricsBox');

// ============================================================
// TEMAS Y PALETAS
// ============================================================
document.querySelectorAll('.palette-dot').forEach(dot => {
  dot.addEventListener('click', () => {
    document.querySelectorAll('.palette-dot').forEach(d => d.classList.remove('active'));
    dot.classList.add('active');
    document.documentElement.setAttribute('data-palette', dot.dataset.color);
  });
});

$('themeToggle').addEventListener('click', () => {
  const html = document.documentElement;
  const newTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
});

// ============================================================
// FONDO PERSONALIZADO
// ============================================================
$('bgInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  $('custom-bg').style.backgroundImage = `url(${url})`;
  document.body.classList.add('has-custom-bg');
  $('bgResetBtn').style.display = 'flex';
  e.target.value = ''; // Resetear input
});

$('bgResetBtn').addEventListener('click', () => {
  $('custom-bg').style.backgroundImage = '';
  document.body.classList.remove('has-custom-bg');
  $('bgResetBtn').style.display = 'none';
});

// ============================================================
// CARGA DE ARCHIVOS DE AUDIO
// ============================================================
$('fileInput').addEventListener('change', e => {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  files.forEach(file => {
    const url = URL.createObjectURL(file);
    const name = file.name.replace(/\.[^/.]+$/, ''); // Quitar extensión
    tracks.push({
      name: name,
      artist: 'Artista desconocido',
      url: url,
      file: file
    });
  });

  renderPlaylist();
  e.target.value = '';

  // Si no hay canción actual, cargar la primera
  if (currentIndex === -1 && tracks.length > 0) {
    loadTrack(0);
  }
});

// ============================================================
// CARGA DE LETRAS (.LRC)
// ============================================================
$('lrcInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    parseLRC(ev.target.result);
    e.target.value = '';
  };
  reader.readAsText(file);
});

function parseLRC(text) {
  lyricsData = [];
  activeLyricIndex = -1;
  const lines = text.split('\n');
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

  lines.forEach(line => {
    const match = line.match(timeRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millis = parseInt(match[3].padEnd(3, '0'), 10);
      const time = minutes * 60 + seconds + millis / 1000;
      const text = match[4].trim();
      if (text) lyricsData.push({ time, text });
    }
  });

  lyricsData.sort((a, b) => a.time - b.time);
  renderLyrics();
}

function renderLyrics() {
  if (lyricsData.length === 0) {
    lyricsBox.innerHTML = '<p>Sin letras disponibles</p>';
    return;
  }
  lyricsBox.innerHTML = lyricsData.map((l, i) => `<p data-index="${i}">${l.text}</p>`).join('');
  activeLyricIndex = -1;
}

function updateLyrics(currentTime) {
  if (lyricsData.length === 0) return;

  let newIndex = -1;
  for (let i = 0; i < lyricsData.length; i++) {
    if (currentTime >= lyricsData[i].time) newIndex = i;
    else break;
  }

  if (newIndex === activeLyricIndex) return;
  activeLyricIndex = newIndex;

  const ps = lyricsBox.querySelectorAll('p');
  ps.forEach((p, i) => p.classList.toggle('active', i === newIndex));

  if (newIndex >= 0 && ps[newIndex]) {
    ps[newIndex].scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

// ============================================================
// REPRODUCCIÓN
// ============================================================
function loadTrack(index) {
  if (index < 0 || index >= tracks.length) return;
  currentIndex = index;
  const track = tracks[index];

  audio.src = track.url;
  songTitle.textContent = track.name;
  songArtist.textContent = track.artist;
  coverBadge.textContent = `Pista ${index + 1} de ${tracks.length}`;

  // Portada genérica
  coverImg.style.display = 'none';
  coverImg.src = '';

  updatePlaylistHighlight();
  resetProgress();
  resetLyrics();
  setupAudioContext(); // Necesario para conectar el audio nuevo
}

function playTrack() {
  if (currentIndex === -1) {
    if (tracks.length > 0) loadTrack(0);
    else return;
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  audio.play().catch(err => console.warn('Error al reproducir:', err));
}

function togglePlay() {
  if (audio.paused) playTrack();
  else audio.pause();
}

function prevTrack() {
  if (tracks.length === 0) return;
  const newIndex = currentIndex > 0 ? currentIndex - 1 : tracks.length - 1;
  loadTrack(newIndex);
  playTrack();
}

function nextTrack() {
  if (tracks.length === 0) return;
  const newIndex = currentIndex < tracks.length - 1 ? currentIndex + 1 : 0;
  loadTrack(newIndex);
  playTrack();
}

function resetProgress() {
  progressFill.style.width = '0%';
  currentTimeEl.textContent = '0:00';
  totalTimeEl.textContent = '0:00';
}

function resetLyrics() {
  lyricsData = [];
  activeLyricIndex = -1;
  lyricsBox.innerHTML = '<p>Sin letras disponibles</p>';
}

// ============================================================
// EVENTOS DE AUDIO
// ============================================================
audio.addEventListener('loadedmetadata', () => {
  totalTimeEl.textContent = formatTime(audio.duration);
});

audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  progressFill.style.width = `${pct}%`;
  currentTimeEl.textContent = formatTime(audio.currentTime);
  updateLyrics(audio.currentTime);
});

audio.addEventListener('play', () => {
  isPlaying = true;
  // Icono de Pausa
  playIcon.innerHTML = '<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>';
});

audio.addEventListener('pause', () => {
  isPlaying = false;
  // Icono de Play
  playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
});

audio.addEventListener('ended', () => {
  nextTrack();
});

// ============================================================
// BARRA DE PROGRESO INTERACTIVA
// ============================================================
progressBar.addEventListener('click', e => {
  if (!audio.duration) return;
  const rect = progressBar.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  audio.currentTime = pct * audio.duration;
});

// ============================================================
// WEBAUDIO API + ECUALIZADOR
// ============================================================
function setupAudioContext() {
  // Crear contexto solo una vez
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Desconectar fuente anterior si existe
  if (sourceNode) {
    try { sourceNode.disconnect(); } catch (e) {}
    sourceNode = null;
  }

  try {
    sourceNode = audioCtx.createMediaElementSource(audio);
  } catch (e) {
    // Si ya está conectado, evitamos el error
    return;
  }

  // Crear cadena de filtros si no existe
  if (eqFilters.length === 0) {
    eqFilters = EQ_FREQS.map((freq, i) => {
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1;
      filter.gain.value = 0;
      return filter;
    });
  }

  // Encadenar: source → filtro1 → filtro2 → ... → destination
  let prev = sourceNode;
  eqFilters.forEach(filter => {
    prev.connect(filter);
    prev = filter;
  });
  prev.connect(audioCtx.destination);
}

// ============================================================
// CONTROLES DEL ECUALIZADOR
// ============================================================
document.querySelectorAll('#eqSliders input[type="range"]').forEach((slider, i) => {
  slider.addEventListener('input', () => {
    const gain = parseFloat(slider.value);
    if (eqFilters[i]) eqFilters[i].gain.value = gain;
    // Desactivar preset al mover manualmente
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  });
});

document.getElementById('eqPresets').addEventListener('click', e => {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;

  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const preset = btn.dataset.preset;
  const gains = {
    flat: [0, 0, 0, 0, 0],
    rock: [5, 3, -1, 3, 5],
    pop: [-1, 2, 4, 2, -1],
    jazz: [3, 1, -2, 1, 3],
    vocal: [-2, 0, 4, 3, -1]
  }[preset] || [0, 0, 0, 0, 0];

  document.querySelectorAll('#eqSliders input[type="range"]').forEach((slider, i) => {
    slider.value = gains[i];
    if (eqFilters[i]) eqFilters[i].gain.value = gains[i];
  });
});

// ============================================================
// PESTAÑAS
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
// LISTA DE REPRODUCCIÓN
// ============================================================
function renderPlaylist() {
  trackCount.textContent = `${tracks.length} pista${tracks.length !== 1 ? 's' : ''}`;
  if (tracks.length === 0) {
    playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Añade música para empezar</li>';
    return;
  }
  playlistEl.innerHTML = tracks.map((t, i) => `
    <li data-index="${i}" class="${i === currentIndex ? 'active' : ''}">
      <span>${t.name}</span>
      <span class="pl-artist">${t.artist}</span>
    </li>
  `).join('');

  playlistEl.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      const idx = parseInt(li.dataset.index);
      loadTrack(idx);
      playTrack();
    });
  });
}

function updatePlaylistHighlight() {
  playlistEl.querySelectorAll('li').forEach((li, i) => {
    li.classList.toggle('active', i === currentIndex);
  });
}

// ============================================================
// UTILIDADES
// ============================================================
function formatTime(sec) {
  if (isNaN(sec) || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ============================================================
// INICIALIZACIÓN Y EVENTOS PRINCIPALES
// ============================================================
playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', prevTrack);
nextBtn.addEventListener('click', nextTrack);

// Estado inicial de la playlist
renderPlaylist();

// Intentar reanudar el contexto de audio al primer toque (política de navegadores)
document.body.addEventListener('touchstart', () => {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}, { once: true });
