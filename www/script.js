/* =========================================
   IMPORTAR FUENTES
   ========================================= */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* ===== VARIABLES DE TEMA (MODO OSCURO POR DEFECTO) ===== */
:root, [data-theme="dark"] {
  --bg-body: #0b0f19;
  --bg-card: rgba(22, 30, 46, 0.7);
  --bg-card-solid: #161e2e;
  --text-primary: #ffffff;
  --text-secondary: #8b98b0;
  --slider-track: rgba(255, 255, 255, 0.1);
  --border-color: rgba(255, 255, 255, 0.08);
  --shadow: 0 20px 40px rgba(0,0,0,0.5);
}

/* ===== VARIABLES DE TEMA (MODO CLARO) ===== */
[data-theme="light"] {
  --bg-body: #e2e8f0;
  --bg-card: rgba(255, 255, 255, 0.85);
  --bg-card-solid: #ffffff;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --slider-track: rgba(0, 0, 0, 0.1);
  --border-color: rgba(0, 0, 0, 0.08);
  --shadow: 0 20px 40px rgba(0,0,0,0.1);
}

/* ===== PALETAS DE COLORES (ACENTOS) ===== */
[data-palette="ocean"] { 
  --accent: #00d2ff; 
  --accent-gradient: linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%); 
  --accent-glow: rgba(0, 210, 255, 0.3);
}
[data-palette="sunset"] { 
  --accent: #ff7e5f; 
  --accent-gradient: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%); 
  --accent-glow: rgba(255, 126, 95, 0.3);
}
[data-palette="forest"] { 
  --accent: #11998e; 
  --accent-gradient: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); 
  --accent-glow: rgba(17, 153, 142, 0.3);
}
[data-palette="mono"] { 
  --accent: #94a3b8; 
  --accent-gradient: linear-gradient(135deg, #cbd5e1 0%, #f8fafc 100%); 
  --accent-glow: rgba(148, 163, 184, 0.3);
}

/* ===== RESETEO Y ESTILOS BASE ===== */
* { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: var(--bg-body);
  color: var(--text-primary);
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: background 0.3s ease, color 0.3s ease;
}

/* ===== FONDO PERSONALIZADO DE LA APP (AQUÍ ESTÁ EL ARREGLO) ===== */
#custom-bg {
  position: fixed;
  inset: 0;
  z-index: -2;
  background-size: cover;
  background-position: center;
  opacity: 0.7; /* Subimos la opacidad de 0.2 a 0.7 para que se vea bien */
  display: none;
  pointer-events: none;
  filter: blur(2px); /* Un desenfoque ligero para que el texto resalte sin perder la imagen */
}
body.has-custom-bg #custom-bg { display: block; }

/* ===== CONTENEDOR PRINCIPAL ===== */
.player-app {
  width: 100%;
  max-width: 480px;
  height: 100%;
  background: var(--bg-card);
  backdrop-filter: blur(15px); /* Redujimos el desenfoque de 25px a 15px */
  -webkit-backdrop-filter: blur(15px);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  transition: background 0.3s ease;
}

/* Cuando hay fondo personalizado, hacemos el fondo de la app más transparente */
body.has-custom-bg .player-app {
  background: rgba(22, 30, 46, 0.6); /* Fondo oscuro semitransparente */
  backdrop-filter: blur(10px); 
  -webkit-backdrop-filter: blur(10px);
}

/* Lo mismo para el tema claro */
body.has-custom-bg[data-theme="light"] .player-app {
  background: rgba(255, 255, 255, 0.6);
}

@media (min-width: 500px) {
  .player-app {
    height: 90vh;
    border-radius: 30px;
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow);
  }
}

/* ===== MENÚ LATERAL ===== */
.side-menu {
  position: fixed;
  top: 0; left: -280px;
  width: 260px; height: 100vh;
  background: var(--bg-card-solid);
  z-index: 1000;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease;
  box-shadow: 2px 0 15px rgba(0,0,0,0.5);
  padding: 20px;
  display: flex; flex-direction: column;
}
.side-menu.open { left: 0; }

.menu-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20px; padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}
.menu-header h2 { font-size: 18px; font-weight: 700; }

.menu-list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.menu-list li button {
  width: 100%; padding: 14px; background: transparent;
  border: 1px solid var(--border-color); color: var(--text-primary);
  border-radius: 12px; text-align: left; font-size: 14px; font-weight: 500;
  cursor: pointer; transition: background 0.2s;
}
.menu-list li button:active { background: var(--slider-track); }

.menu-overlay {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(2px);
  z-index: 999; opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
}
.menu-overlay.active { opacity: 1; pointer-events: auto; }

/* ===== PANTALLAS ===== */
#screen-playlist, #screen-player {
  width: 100%; height: 100%; display: flex; flex-direction: column;
  padding: 20px; animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== BARRA SUPERIOR ===== */
.top-bar {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 15px; padding-top: env(safe-area-inset-top);
}
.top-bar h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }

.icon-btn {
  background: var(--bg-card-solid); border: 1px solid var(--border-color);
  color: var(--text-primary); width: 42px; height: 42px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s;
}
.icon-btn:active { transform: scale(0.9); }
.icon-btn svg { width: 20px; height: 20px; fill: currentColor; }

/* ===== SELECTOR DE PALETA ===== */
.palette-switcher {
  display: flex; gap: 12px; justify-content: center; margin-bottom: 15px;
}
.palette-dot {
  width: 24px; height: 24px; border-radius: 50%;
  border: 2px solid transparent; cursor: pointer; transition: all 0.3s;
}
.palette-dot.active { border-color: var(--text-primary); transform: scale(1.2); }
.palette-dot[data-color="ocean"] { background: #00d2ff; }
.palette-dot[data-color="sunset"] { background: #ff7e5f; }
.palette-dot[data-color="forest"] { background: #11998e; }
.palette-dot[data-color="mono"] { background: #cbd5e1; }

/* ===== LISTA DE REPRODUCCIÓN ===== */
.playlist-section h3 {
  font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--text-secondary);
}
.playlist {
  list-style: none; display: flex; flex-direction: column; gap: 8px; padding-bottom: 20px;
}
.playlist li {
  padding: 10px 12px; border-radius: 12px;
  background: var(--bg-card-solid); cursor: pointer;
  transition: background 0.2s, transform 0.1s; border: 1px solid transparent;
}
.playlist li:active { transform: scale(0.98); }
.playlist li.active { border-color: var(--accent); background: var(--accent-glow); }
.playlist li.active span:first-child { color: var(--accent); }

/* ===== BOTONES INFERIORES ===== */
.bottom-actions {
  display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;
  margin-top: auto; padding-top: 10px; padding-bottom: env(safe-area-inset-bottom);
}
.file-label {
  display: flex; align-items: center; gap: 8px; padding: 12px 20px;
  background: var(--accent-gradient); color: #fff; border-radius: 30px;
  font-size: 14px; font-weight: 600; cursor: pointer;
  box-shadow: 0 6px 15px var(--accent-glow); flex: 1; justify-content: center;
}
.file-label:active { transform: scale(0.96); }
.bg-label {
  display: flex; align-items: center; gap: 6px; padding: 12px 16px;
  background: var(--bg-card-solid); border: 1px solid var(--border-color);
  color: var(--text-primary); border-radius: 30px; font-size: 13px; cursor: pointer;
}

/* Ocultar inputs de archivo */
.file-label input, .bg-label input { display: none; }

/* =========================================
   REPRODUCTOR (FOTO EN GRANDE)
   ========================================= */
.cover-container {
  position: relative; width: 100%; aspect-ratio: 1 / 1;
  max-height: 260px; margin: 10px auto; border-radius: 20px;
  overflow: hidden; background: var(--bg-card-solid);
  box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.4);
}

.cover-container .cover-placeholder {
  position: absolute; top: 0; left: 0;
  width: 100%; height: 100%; 
  display: flex; align-items: center; justify-content: center;
  font-size: 80px; opacity: 0.3; z-index: 1;
}

.cover-container img { 
  position: absolute; top: 0; left: 0;
  width: 100%; height: 100%; object-fit: cover; 
  z-index: 2; display: none;
}

.cover-badge {
  position: absolute; bottom: 12px; right: 12px; background: rgba(0,0,0,0.6);
  backdrop-filter: blur(10px); color: #fff; padding: 6px 14px; border-radius: 20px;
  font-size: 12px; font-weight: 600; z-index: 3;
}

.song-info { text-align: center; margin-bottom: 15px; }
.song-title {
  font-size: 22px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.song-artist { font-size: 15px; color: var(--text-secondary); margin-top: 4px; }

/* Barra de progreso */
.progress-section { margin-bottom: 15px; }
.progress-bar-wrap {
  position: relative; height: 6px; background: var(--slider-track); border-radius: 4px; cursor: pointer;
}
.progress-fill {
  height: 100%; width: 0%; background: var(--accent-gradient);
  border-radius: 4px; position: relative;
}
.progress-fill::after {
  content: ''; position: absolute; right: -4px; top: 50%; transform: translateY(-50%);
  width: 12px; height: 12px; background: #fff; border-radius: 50%; box-shadow: 0 0 10px var(--accent);
}
.time-labels {
  display: flex; justify-content: space-between; font-size: 12px;
  color: var(--text-secondary); margin-top: 8px; font-variant-numeric: tabular-nums;
}

/* Controles */
.controls {
  display: flex; align-items: center; justify-content: center; gap: 30px; margin-bottom: 20px;
}
.ctrl-btn { background: none; border: none; color: var(--text-primary); cursor: pointer; }
.ctrl-btn svg { width: 32px; height: 32px; fill: currentColor; }
.ctrl-btn:active { transform: scale(0.85); }
.play-btn {
  width: 72px; height: 72px; background: var(--accent-gradient);
  color: #ffffff; border-radius: 50%; box-shadow: 0 10px 25px var(--accent-glow);
  display: flex; align-items: center; justify-content: center;
}
.play-btn svg { width: 36px; height: 36px; margin-left: 2px; }

/* Pestañas y Ecualizador */
.tab-bar {
  display: flex; gap: 4px; background: var(--bg-card-solid);
  border-radius: 12px; padding: 5px; margin-bottom: 15px;
}
.tab-btn {
  flex: 1; padding: 10px; border: none; background: transparent;
  color: var(--text-secondary); font-size: 14px; font-weight: 600; border-radius: 8px; cursor: pointer;
}
.tab-btn.active { background: var(--bg-body); color: var(--text-primary); box-shadow: 0 4px 10px rgba(0,0,0,0.2); }

.tab-content { display: none; flex: 1; overflow-y: auto; }
.tab-content.active { display: block; }

.lyrics-box { text-align: center; padding: 15px; font-size: 15px; color: var(--text-secondary); line-height: 1.8; }

.eq-container { padding: 10px; }
.eq-presets { display: flex; gap: 8px; justify-content: center; margin-bottom: 20px; flex-wrap: wrap; }
.preset-btn {
  padding: 6px 14px; border: 1px solid var(--border-color); background: transparent;
  color: var(--text-secondary); border-radius: 20px; font-size: 12px;
}
.preset-btn.active { background: var(--accent-gradient); color: #fff; border: none; }

.eq-sliders { display: flex; justify-content: space-between; }
.eq-band { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.eq-band label { font-size: 11px; color: var(--text-secondary); }
.eq-band input[type="range"] {
  -webkit-appearance: none; writing-mode: vertical-lr; direction: rtl;
  width: 8px; height: 100px; background: var(--slider-track); border-radius: 4px;
}
.eq-band input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%;
  background: #fff; box-shadow: 0 0 10px rgba(0,0,0,0.5);
}

/* Scrollbars */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-thumb { background: var(--slider-track); border-radius: 10px; }
