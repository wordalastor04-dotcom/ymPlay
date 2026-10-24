// ============================================================
// 1. CONFIGURACIÓN E IMPORTACIÓN DEL PLUGIN NATIVO
// ============================================================
const audio = new Audio();
audio.crossOrigin = "anonymous";
let tracks = [];
let currentIndex = -1;

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

// Elementos del Menú
const menuBtn = $('menuBtn');
const sideMenu = $('side-menu');
const menuOverlay = $('menu-overlay');
const closeMenuBtn = $('closeMenuBtn');
const sortNewestBtn = $('sortNewestBtn');
const sortOldestBtn = $('sortOldestBtn');
const sortTitleBtn = $('sortTitleBtn');

// ============================================================
// 3. ESCANEO NATIVO
// ============================================================
async function escanearMusicaNativa() {
  const MediaStorePlugin = window.Capacitor?.Plugins?.CapacitorMediaStore;

  if (!window.Capacitor || !MediaStorePlugin) {
    playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Escaneo solo en APK.</li>';
    return;
  }

  try {
    playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Buscando música...</li>';
    await MediaStorePlugin.requestPermissions({ types: ['audio'] });

    const result = await MediaStorePlugin.getMediasByType({ 
      mediaType: 'audio', sortBy: 'TITLE', includeExternal: true
    });

    const listaAudios = result.media || result.medias || [];

    if (listaAudios.length > 0) {
      tracks = listaAudios.map(song => {
        return {
          name: song.title || song.name || 'Desconocido',
          artist: song.artist || 'Artista desconocido',
          url: song.url || song.uri || song.path,
          cover: song.albumArt || song.albumArtUri || song.cover || '',
          // Guardamos la fecha o el ID para poder ordenar
          dateAdded: song.dateAdded || song.date_added || song.id || 0 
        };
      }).filter(t => t.url);
      
      // Ordenar por defecto: Más recientes primero
      sortTracks('newest');
    } else {
      playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">No se encontró música.</li>';
    }
  } catch (error) {
    console.error(error);
    playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Error al leer archivos.</li>';
  }
}

// ============================================================
// 4. RENDERIZAR LISTA Y PORTADAS
// ============================================================
function renderPlaylist() {
  if (trackCount) trackCount.textContent = `${tracks.length} pistas`;
  
  if (tracks.length === 0) return;

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
// 5. REPRODUCTOR Y AUDIO
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

function togglePlay() { if (audio.paused) playAudio(); else audio.pause(); }
function prevTrack() { if (tracks.length) cargarCancion(currentIndex > 0 ? currentIndex - 1 : tracks.length - 1); }
function nextTrack() { if (tracks.length) cargarCancion(currentIndex < tracks.length - 1 ? currentIndex + 1 : 0); }

// ============================================================
// 6. LÓGICA DEL MENÚ Y ORDENAMIENTO
// ============================================================
function openMenu() {
  sideMenu.classList.add('open');
  menuOverlay.classList.add('active');
}

function closeMenu() {
  sideMenu.classList.remove('open');
  menuOverlay.classList.remove('active');
}

function sortTracks(criteria) {
  if (criteria === 'newest') {
    // Ordenar de mayor a menor (fecha o ID más alto primero)
    tracks.sort((a, b) => b.dateAdded - a.dateAdded);
  } else if (criteria === 'oldest') {
    // Ordenar de menor a mayor
    tracks.sort((a, b) => a.dateAdded - b.dateAdded);
  } else if (criteria === 'title') {
    // Orden alfabético
    tracks.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  // Si había una canción sonando, actualizamos su índice en la nueva lista
  if (currentIndex !== -1) {
    const currentTrack = tracks[currentIndex];
    currentIndex = tracks.findIndex(t => t.url === currentTrack.url);
  }

  renderPlaylist();
  closeMenu();
}

// Eventos del menú
menuBtn?.addEventListener('click', openMenu);
closeMenuBtn?.addEventListener('click', closeMenu);
menuOverlay?.addEventListener('click', closeMenu);

sortNewestBtn?.addEventListener('click', () => sortTracks('newest'));
sortOldestBtn?.addEventListener('click', () => sortTracks('oldest'));
sortTitleBtn?.addEventListener('click', () => sortTracks('title'));


// ============================================================
// 7. EVENTOS DE AUDIO, ECUALIZADOR Y UI
// ============================================================
audio.addEventListener('loadedmetadata', () => { if(totalTimeEl) totalTimeEl.textContent = formatTime(audio.duration); });
audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  if(progressFill) progressFill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
  if(currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
});
audio.addEventListener('play', () => { 
  if(playIcon) playIcon.innerHTML = '<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>'; 
  setupAudioContext(); 
});
audio.addEventListener('pause', () => { if(playIcon) playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>'; });
audio.addEventListener('ended', nextTrack);

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

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

function abrirReproductor() { if(screenPlaylist) screenPlaylist.style.display = 'none'; if(screenPlayer) screenPlayer.style.display = 'flex'; }
function volverALista() { if(screenPlayer) screenPlayer.style.display = 'none'; if(screenPlaylist) screenPlaylist.style.display = 'flex'; renderPlaylist(); }
function resetProgress() { if(progressFill) progressFill.style.width = '0%'; if(currentTimeEl) currentTimeEl.textContent = '0:00'; if(totalTimeEl) totalTimeEl.textContent = '0:00'; }
function formatTime(sec) { if (isNaN(sec)) return '0:00'; return `${Math.floor(sec/60)}:${Math.floor(sec%60).toString().padStart(2, '0')}`; }

if(playBtn) playBtn.addEventListener('click', togglePlay);
if(prevBtn) prevBtn.addEventListener('click', prevTrack);
if(nextBtn) nextBtn.addEventListener('click', nextTrack);
if(backToListBtn) backToListBtn.addEventListener('click', volverALista);
if(btnEscanear) btnEscanear.addEventListener('click', (e) => { e.preventDefault(); escanearMusicaNativa(); });

document.addEventListener('DOMContentLoaded', () => { setTimeout(() => { escanearMusicaNativa(); }, 1500); });
