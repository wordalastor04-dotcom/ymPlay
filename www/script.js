// ============================================================
// CONFIGURACIÓN E IMPORTACIÓN DEL PLUGIN NATIVO
// ============================================================
const audio = new Audio();
let tracks = [];
let currentIndex = -1;
let isPlaying = false;

// Detectar si estamos en la app Android (Capacitor)
const isCapacitor = window.Capacitor !== undefined;
let MediaStore = null;
if (isCapacitor) {
  MediaStore = window.Capacitor.Plugins.MediaStore;
}

// ============================================================
// REFERENCIAS DOM (Ajustadas a tu HTML)
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
const playlistEl = $('playlist');
const trackCount = $('trackCount');

// ============================================================
// FUNCIÓN PRINCIPAL: ESCANEAR MÚSICA DEL TELÉFONO
// ============================================================
async function escanearMusicaNativa() {
  if (!isCapacitor || !MediaStore) {
    console.warn("MediaStore no disponible. Ejecutando en navegador web.");
    // Datos de prueba para que veas la lista en la PC
    tracks = [
      { name: "Canción de Prueba (Web)", artist: "Artista Web", url: "", cover: "" }
    ];
    renderPlaylist();
    return;
  }

  try {
    // 1. Pedir permisos (El plugin suele manejarlo, pero forzamos la llamada)
    // 2. Obtener la lista de audios
    const result = await MediaStore.getMedias({ mediaType: 'audio' });
    
    // Dependiendo de la versión del plugin, los datos vienen en result.medias o result.files
    const listaAudios = result.medias || result.files || result.audios || [];

    if (listaAudios.length > 0) {
      tracks = listaAudios.map(song => {
        return {
          // Mapeamos los datos que devuelve Android a lo que usa tu app
          name: song.title || song.name || 'Desconocido',
          artist: song.artist || 'Artista desconocido',
          url: song.url || song.uri, // La ruta real del archivo en Android
          cover: song.albumArt || song.albumArtUri || '', // Portada (si el plugin la obtiene)
          file: null
        };
      });

      // Filtrar canciones que no tengan URL válida
      tracks = tracks.filter(t => t.url);
      
      renderPlaylist();
    } else {
      alert("No se encontró música en el teléfono.");
    }
  } catch (error) {
    console.error("Error al escanear música:", error);
    alert("Hubo un error al buscar la música. Revisa los permisos.");
  }
}

// ============================================================
// RENDERIZAR LISTA
// ============================================================
function renderPlaylist() {
  trackCount.textContent = `${tracks.length} pista${tracks.length !== 1 ? 's' : ''}`;
  if (tracks.length === 0) {
    playlistEl.innerHTML = '<li style="justify-content:center;color:var(--text-secondary);">Buscando música...</li>';
    return;
  }

  playlistEl.innerHTML = tracks.map((t, i) => `
    <li data-index="${i}" class="${i === currentIndex ? 'active' : ''}">
      <div style="display:flex; align-items:center; gap:10px;">
        <!-- Mostrar portada si existe -->
        ${t.cover ? `<img src="${t.cover}" style="width:40px;height:40px;border-radius:5px;object-fit:cover;">` : '<div style="width:40px;height:40px;background:#333;border-radius:5px;"></div>'}
        <div style="display:flex; flex-direction:column;">
            <span style="font-weight:bold;">${t.name}</span>
            <span class="pl-artist" style="font-size:12px;color:var(--text-secondary);">${t.artist}</span>
        </div>
      </div>
    </li>
  `).join('');

  // EVENTO: Al tocar una canción, cargarla y abrir el menú
  playlistEl.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      const idx = parseInt(li.dataset.index);
      cargarCancion(idx);
      // Aquí abrimos la vista del reproductor (si tienes una vista separada)
      abrirReproductor(); 
    });
  });
}

// ============================================================
// CARGAR Y REPRODUCIR CANCIÓN
// ============================================================
function cargarCancion(index) {
  if (index < 0 || index >= tracks.length) return;
  currentIndex = index;
  const track = tracks[index];

  // El plugin devuelve rutas locales, así que el Audio las leerá directo
  audio.src = track.url;
  
  // Actualizar interfaz (Menú del reproductor)
  songTitle.textContent = track.name;
  songArtist.textContent = track.artist;
  
  // Actualizar portada
  if (track.cover) {
    coverImg.src = track.cover;
    coverImg.style.display = 'block';
  } else {
    coverImg.style.display = 'none';
  }

  updatePlaylistHighlight();
  resetProgress();
  
  // Reproducir automáticamente
  reproducirAudio();
}

function reproducirAudio() {
  if (currentIndex === -1) return;
  audio.play().catch(err => console.warn('Error al reproducir:', err));
}

function togglePlay() {
  if (audio.paused) reproducirAudio();
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
// UTILIDADES DE INTERFAZ
// ============================================================
function abrirReproductor() {
  // Si tienes una pantalla o menú que se oculta, muéstralo aquí.
  // Por ejemplo, si usas clases CSS para cambiar de pantalla:
  // document.getElementById('pantalla-lista').style.display = 'none';
  // document.getElementById('pantalla-reproductor').style.display = 'flex';
  console.log("Abriendo reproductor para:", tracks[currentIndex].name);
}

function updatePlaylistHighlight() {
  playlistEl.querySelectorAll('li').forEach((li, i) => {
    li.classList.toggle('active', i === currentIndex);
  });
}

function resetProgress() {
  progressFill.style.width = '0%';
  currentTimeEl.textContent = '0:00';
  totalTimeEl.textContent = '0:00';
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
});

audio.addEventListener('play', () => {
  isPlaying = true;
  // Icono de pausa
  if(playIcon) playIcon.innerHTML = '<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>';
});

audio.addEventListener('pause', () => {
  isPlaying = false;
  // Icono de play
  if(playIcon) playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
});

audio.addEventListener('ended', nextTrack);

// Barra de progreso interactiva
if(progressBar) {
    progressBar.addEventListener('click', e => {
      if (!audio.duration) return;
      const rect = progressBar.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      audio.currentTime = pct * audio.duration;
    });
}

function formatTime(sec) {
  if (isNaN(sec) || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ============================================================
// INICIALIZACIÓN
// ============================================================
if(playBtn) playBtn.addEventListener('click', togglePlay);
if(prevBtn) prevBtn.addEventListener('click', prevTrack);
if(nextBtn) nextBtn.addEventListener('click', nextTrack);

// Ejecutar el escaneo en cuanto la app abra
document.addEventListener('DOMContentLoaded', () => {
  // Pequeño retraso para que Android muestre la ventana de "Permitir acceso a archivos"
  setTimeout(() => {
    escanearMusicaNativa();
  }, 1500); 
});
