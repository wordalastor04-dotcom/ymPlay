// ============================================================
// 1. CONFIGURACIÓN E IMPORTACIÓN DEL PLUGIN NATIVO
// ============================================================
const audio = new Audio();
audio.crossOrigin = "anonymous"; // Necesario para el ecualizador
let tracks = [];
let currentIndex = -1;
let isPlaying = false;

// Variables para el ecualizador
let audioCtx = null;
let sourceNode = null;
let eqFilters = [];
const EQ_FREQS = [60, 250, 1000, 4000, 14000];

// ============================================================
// 2. REFERENCIAS DOM
// ============================================================
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

// ============================================================
// 3. ESCANEO NATIVO DE MÚSICA
// ============================================================
async function escanearMusicaNativa() {
  const MediaStorePlugin = window.Capacitor?.Plugins?.CapacitorMediaStore;

  if (!window.Capacitor || !MediaStorePlugin) {
    playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Escaneo solo disponible en el APK.</li>';
    return;
  }

  try {
    playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Buscando música...</li>';
    await MediaStorePlugin.requestPermissions({ types: ['audio'] });

    const result = await MediaStorePlugin.getMediasByType({ 
      mediaType: 'audio',
      sortBy: 'TITLE',
      includeExternal: true
    });

    const listaAudios = result.media || result.medias || [];

    if (listaAudios.length > 0) {
      tracks = listaAudios.map(song => {
        // A veces el plugin devuelve la URL en distintas propiedades
        const rawUrl = song.url || song.uri || song.path;
        const rawCover = song.albumArt || song.albumArtUri || song.cover || '';

        return {
          name: song.title || song.name || 'Desconocido',
          artist: song.artist || 'Artista desconocido',
          url: rawUrl,
          cover: rawCover
        };
      }).filter(t => t.url); // Filtrar los que no tengan ruta válida
      
      renderPlaylist();
    } else {
      playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">No se encontró música.</li>';
    }
  } catch (error) {
    console.error("Error al escanear:", error);
    playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Error al leer archivos.</li>';
  }
}

// ============================================================
// 4. RENDERIZAR LISTA (CON PORTADAS)
// ============================================================
function renderPlaylist() {
  if (trackCount) trackCount.textContent = `${tracks.length} pista${tracks.length !== 1 ? 's' : ''}`;
  
  if (tracks.length === 0) {
    playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">No hay música</li>';
    return;
  }

  playlistEl.innerHTML = tracks.map((t, i) => {
    // CONVERTIR LA PORTADA PARA QUE SE VEA EN EL WEBVIEW
    let displayCover = '';
    if (t.cover) {
      displayCover = window.Capacitor && window.Capacitor.convertFileSrc 
                     ? window.Capacitor.convertFileSrc(t.cover) 
                     : t.cover;
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
// 5. REPRODUCTOR Y CONVERSIÓN DE AUDIO
// ============================================================
function cargarCancion(index) {
  if (index < 0 || index >= tracks.length) return;
  currentIndex = index;
  const track = tracks[index];

  // CONVERTIR LA RUTA DE AUDIO PARA QUE SUENE EN EL WEBVIEW
  const playableUrl = window.Capacitor && window.Capacitor.convertFileSrc 
                      ? window.Capacitor.convertFileSrc(track.url) 
                      : track.url;

  audio.src = playableUrl;
  
  if(songTitle) songTitle.textContent = track.name;
  if(songArtist) songArtist.textContent = track.artist;
  if (coverBadge) coverBadge.textContent = `Pista ${index + 1} de ${tracks.length}`;

  // Mostrar portada en el reproductor
  if (track.cover && coverImg) {
    coverImg.src = window.Capacitor && window.Capacitor.convertFileSrc 
                   ? window.Capacitor.convertFileSrc(track.cover) 
                   : track.cover;
    coverImg.style.display = 'block';
  } else if (coverImg) {
    coverImg.style.display = 'none';
  }

  updatePlaylistHighlight();
  resetProgress();
  playAudio();
}

function playAudio() {
  if (currentIndex === -1) return;
  
  // Desbloquear el contexto de audio si está suspendido
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  audio.play().catch(err => {
    console.warn('Error al reproducir:', err);
    alert("No se pudo reproducir el audio. Intenta de nuevo.");
  });
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
  setupAudioContext(); // Configurar el ecualizador SOLO cuando empieza a sonar
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
// 7. ECUALIZADOR (ARREGLADO PARA NO SILENCIAR EL AUDIO)
// ============================================================
function setupAudioContext() {
  // Si ya se configuró, no hacer nada para evitar errores
  if (sourceNode) return; 

  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    sourceNode = audioCtx.createMediaElementSource(audio);
    
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
  } catch (e) {
    console.log("Ecualizador no disponible:", e);
  }
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
// 8. PESTAÑAS, TEMAS Y UTILIDADES
// ============================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

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

function formatTime(sec) {
  if (isNaN(sec) || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
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

function abrirReproductor() {
  if(screenPlaylist) screenPlaylist.style.display = 'none';
  if(screenPlayer) screenPlayer.style.display = 'flex';
}

function volverALista() {
  if(screenPlayer) screenPlayer.style.display = 'none';
  if(screenPlaylist) screenPlaylist.style.display = 'flex';
  renderPlaylist();
}

// ============================================================
// 9. INICIALIZACIÓN
// ============================================================
if(playBtn) playBtn.addEventListener('click', togglePlay);
if(prevBtn) prevBtn.addEventListener('click', prevTrack);
if(nextBtn) nextBtn.addEventListener('click', nextTrack);
if(backToListBtn) backToListBtn.addEventListener('click', volverALista);

if(btnEscanear) {
  btnEscanear.addEventListener('click', (e) => {
    e.preventDefault(); 
    escanearMusicaNativa();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    escanearMusicaNativa();
  }, 1500);
});
