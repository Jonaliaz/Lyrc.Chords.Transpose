/**
 * LyrChords Transposer - Motor de Acompañamiento por Tempo & Metrónomo
 * Gestiona el metrónomo (audio/visual), el avance progresivo de acordes y letras,
 * y el auto-scroll inteligente sincronizado por compases y pulsos (BPM).
 */

const TempoCompanion = (function () {
  'use strict';

  // Contexto de Audio Web para el metrónomo sintético
  let audioCtx = null;

  // Estado del motor de tempo
  const state = {
    bpm: 100,
    timeSignature: 4, // 4 = 4/4, 3 = 3/4, 2 = 2/4, 6 = 6/8
    beatsPerChord: 4, // 4 = 1 compás por acorde, 2 = 1/2 compás, 'auto' = repartido
    soundEnabled: true,
    countInEnabled: true,
    autoScrollEnabled: true,
    
    // Estado de reproducción
    isPlaying: false,
    isPaused: false,
    isCountingIn: false,
    countInBeat: 0,
    
    currentLineIndex: -1,
    currentStepIndex: -1,
    currentBeatInStep: 0,
    currentMeasureBeat: 1,
    
    timeline: [], // Array de líneas y pasos procesados
    timerId: null,
    nextBeatTime: 0,
    tapTimestamps: []
  };

  // Referencias a elementos del DOM de la barra de tempo
  let ui = {
    companionBar: null,
    btnToggleCompanion: null,
    btnPlayPause: null,
    btnStop: null,
    btnPrevLine: null,
    btnNextLine: null,
    bpmDisplay: null,
    bpmSlider: null,
    btnBpmDec: null,
    btnBpmInc: null,
    btnTapTempo: null,
    timeSignatureSelect: null,
    beatsPerChordSelect: null,
    btnToggleSound: null,
    btnToggleCountIn: null,
    beatLedsContainer: null,
    countInIndicator: null,
    sheetWrapper: null,
    sheetBody: null
  };

  /**
   * Inicializa el AudioContext en la primera interacción del usuario
   */
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  /**
   * Genera el sonido de clic de metrónomo mediante síntesis Web Audio
   */
  function playClickSound(isAccented) {
    if (!state.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Tono agudo y penetrante para el pulso 1 (acento), tono más suave para los demás
      osc.frequency.setValueAtTime(isAccented ? 1200 : 800, ctx.currentTime);

      // Envolvente de volumen muy corta y percusiva (tipo madera / metrónomo digital)
      const now = ctx.currentTime;
      const volume = isAccented ? 0.9 : 0.6;
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isAccented ? 0.055 : 0.038));

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {
      console.warn('Audio click error:', e);
    }
  }

  /**
   * Analiza la hoja de canción actual en el DOM y construye la línea de tiempo de reproducción
   */
  function buildTimeline() {
    if (!ui.sheetBody) return [];

    const lines = Array.from(ui.sheetBody.querySelectorAll('.song-section-title, .chord-only-line, .song-line'));
    const timeline = [];

    lines.forEach((lineEl, lineIdx) => {
      lineEl.setAttribute('data-tempo-line-idx', lineIdx);

      // Caso 1: Título de sección ([Intro], [Coro], etc.)
      if (lineEl.classList.contains('song-section-title')) {
        timeline.push({
          lineEl,
          type: 'section',
          text: lineEl.textContent.trim(),
          steps: [
            {
              targetEl: lineEl,
              type: 'section',
              chord: null,
              lyric: lineEl.textContent.trim(),
              beats: state.timeSignature // 1 compás completo para la sección
            }
          ]
        });
        return;
      }

      // Caso 2: Línea solo de acordes
      if (lineEl.classList.contains('chord-only-line')) {
        const chordBadges = Array.from(lineEl.querySelectorAll('.chord-badge'));
        if (chordBadges.length === 0) return;

        const beatsPerChord = calculateBeatsForChordCount(chordBadges.length);
        const steps = chordBadges.map((badge, segIdx) => {
          badge.setAttribute('data-tempo-line-idx', lineIdx);
          badge.setAttribute('data-tempo-step-idx', segIdx);
          return {
            targetEl: badge,
            type: 'chord-only',
            chord: badge.textContent.trim(),
            lyric: '',
            beats: beatsPerChord
          };
        });

        timeline.push({
          lineEl,
          type: 'chord-only-line',
          steps
        });
        return;
      }

      // Caso 3: Línea con letra y acordes
      if (lineEl.classList.contains('song-line')) {
        if (lineEl.classList.contains('song-line-empty')) return;

        const pairs = Array.from(lineEl.querySelectorAll('.chord-lyric-pair'));
        if (pairs.length === 0) return;

        // Contar acordes activos en esta línea
        const chordPairs = pairs.filter(p => {
          const c = p.querySelector('.chord-badge:not(.empty-chord)');
          return c && c.textContent.trim().length > 0;
        });

        const steps = [];

        if (chordPairs.length > 0) {
          // Si hay acordes, cada grupo o par con acorde marca un hito musical
          const beatsPerGroup = calculateBeatsForChordCount(chordPairs.length);

          pairs.forEach((pair, segIdx) => {
            const chordBadge = pair.querySelector('.chord-badge');
            const lyricSpan = pair.querySelector('.lyric-text');
            const hasChord = chordBadge && !chordBadge.classList.contains('empty-chord') && chordBadge.textContent.trim().length > 0;

            pair.setAttribute('data-tempo-line-idx', lineIdx);
            pair.setAttribute('data-tempo-step-idx', segIdx);

            steps.push({
              targetEl: pair,
              chordEl: chordBadge,
              lyricEl: lyricSpan,
              type: 'pair',
              hasChord,
              chord: hasChord ? chordBadge.textContent.trim() : null,
              lyric: lyricSpan ? lyricSpan.textContent : '',
              beats: hasChord ? beatsPerGroup : Math.max(1, Math.round(beatsPerGroup / 2))
            });
          });
        } else {
          // Línea sin acordes: se divide uniformemente en 1 compás (4 tiempos)
          pairs.forEach((pair, segIdx) => {
            const lyricSpan = pair.querySelector('.lyric-text');
            pair.setAttribute('data-tempo-line-idx', lineIdx);
            pair.setAttribute('data-tempo-step-idx', segIdx);

            steps.push({
              targetEl: pair,
              chordEl: null,
              lyricEl: lyricSpan,
              type: 'pair',
              hasChord: false,
              chord: null,
              lyric: lyricSpan ? lyricSpan.textContent : '',
              beats: Math.max(1, Math.floor(state.timeSignature / pairs.length) || 1)
            });
          });
        }

        timeline.push({
          lineEl,
          type: 'lyric-line',
          steps
        });
      }
    });

    state.timeline = timeline;
    return timeline;
  }

  /**
   * Calcula los tiempos (beats) que debe recibir cada acorde según la configuración
   */
  function calculateBeatsForChordCount(chordCount) {
    if (state.beatsPerChord !== 'auto') {
      return parseInt(state.beatsPerChord, 10) || state.timeSignature;
    }

    // Modo automático inteligente:
    // Si hay 1 acorde en la línea -> 1 compás entero (ej: 4 tiempos)
    // Si hay 2 acordes -> 2 compases (4 tiempos c/u) o 2 tiempos c/u
    // Si hay 4 acordes -> 4 tiempos c/u (4 compases) o 2 tiempos
    if (chordCount <= 2) {
      return state.timeSignature; // 1 compás por acorde
    } else if (chordCount === 3) {
      return state.timeSignature === 3 ? 3 : 2;
    } else {
      return Math.max(2, Math.floor(state.timeSignature));
    }
  }

  /**
   * Inicia o reanuda la reproducción sincronizada
   */
  function start() {
    getAudioContext();
    buildTimeline();

    if (state.timeline.length === 0) {
      return;
    }

    state.isPlaying = true;
    state.isPaused = false;

    // Si estábamos detenidos, empezar desde el principio
    if (state.currentLineIndex === -1) {
      if (state.countInEnabled) {
        startCountIn();
        return;
      } else {
        state.currentLineIndex = 0;
        state.currentStepIndex = 0;
        state.currentBeatInStep = 0;
        state.currentMeasureBeat = 1;
      }
    }

    updatePlayPauseUI();
    scheduleNextBeat();
    highlightCurrentStep();
  }

  /**
   * Inicia el conteo previo (pre-roll / 1-2-3-4)
   */
  function startCountIn() {
    state.isCountingIn = true;
    state.countInBeat = 0;
    state.currentLineIndex = 0;
    state.currentStepIndex = 0;
    state.currentBeatInStep = 0;
    state.currentMeasureBeat = 1;

    updatePlayPauseUI();
    showCountInIndicator(true);
    scheduleNextBeat();
  }

  /**
   * Pausa la reproducción
   */
  function pause() {
    state.isPlaying = false;
    state.isPaused = true;
    clearTimeout(state.timerId);
    state.timerId = null;
    updatePlayPauseUI();
  }

  /**
   * Detiene y restablece todo al inicio
   */
  function stop() {
    state.isPlaying = false;
    state.isPaused = false;
    state.isCountingIn = false;
    clearTimeout(state.timerId);
    state.timerId = null;

    state.currentLineIndex = -1;
    state.currentStepIndex = -1;
    state.currentBeatInStep = 0;
    state.currentMeasureBeat = 1;

    clearAllHighlights();
    showCountInIndicator(false);
    updatePlayPauseUI();
    updateBeatLeds(0);

    // Regresar scroll al inicio si está habilitado
    if (ui.sheetWrapper) {
      ui.sheetWrapper.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Alterna reproducción y pausa
   */
  function togglePlayPause() {
    if (state.isPlaying) {
      pause();
    } else {
      start();
    }
  }

  /**
   * Programa y ejecuta el siguiente pulso (beat) con alta precisión
   */
  function scheduleNextBeat() {
    if (!state.isPlaying) return;

    const intervalMs = (60 / state.bpm) * 1000;

    // Manejar conteo previo
    if (state.isCountingIn) {
      state.countInBeat++;
      const isAccented = state.countInBeat === 1;
      playClickSound(isAccented);
      updateBeatLeds(state.countInBeat);
      updateCountInDisplay(state.countInBeat);

      if (state.countInBeat >= state.timeSignature) {
        // Conteo finalizado -> iniciar canción en el siguiente pulso
        state.isCountingIn = false;
        showCountInIndicator(false);
        state.currentLineIndex = 0;
        state.currentStepIndex = 0;
        state.currentBeatInStep = 0;
        state.currentMeasureBeat = 1;
        highlightCurrentStep();
      }

      state.timerId = setTimeout(scheduleNextBeat, intervalMs);
      return;
    }

    // Ejecución regular de compases de la canción
    const isAccented = state.currentMeasureBeat === 1;
    playClickSound(isAccented);
    updateBeatLeds(state.currentMeasureBeat);

    // Incrementar pulso del compás actual
    state.currentMeasureBeat++;
    if (state.currentMeasureBeat > state.timeSignature) {
      state.currentMeasureBeat = 1;
    }

    // Incrementar pulso del acorde/paso actual
    state.currentBeatInStep++;

    const currentLine = state.timeline[state.currentLineIndex];
    if (currentLine) {
      const currentStep = currentLine.steps[state.currentStepIndex];
      const stepDurationBeats = currentStep ? currentStep.beats : state.timeSignature;

      if (state.currentBeatInStep >= stepDurationBeats) {
        advanceToNextStep();
      }
    }

    // Programar el siguiente pulso
    state.timerId = setTimeout(scheduleNextBeat, intervalMs);
  }

  /**
   * Avanza al siguiente paso (acorde o palabra) y línea
   */
  function advanceToNextStep() {
    state.currentBeatInStep = 0;

    const currentLine = state.timeline[state.currentLineIndex];
    if (!currentLine) {
      stop();
      return;
    }

    // Avanzar al siguiente paso dentro de la misma línea
    if (state.currentStepIndex + 1 < currentLine.steps.length) {
      state.currentStepIndex++;
      highlightCurrentStep();
      return;
    }

    // Si terminamos los pasos de la línea actual, pasar a la siguiente línea
    if (state.currentLineIndex + 1 < state.timeline.length) {
      state.currentLineIndex++;
      state.currentStepIndex = 0;
      highlightCurrentStep();
    } else {
      // Llegamos al final de la canción
      stop();
    }
  }

  /**
   * Salta a una línea y paso específicos (por ejemplo al hacer clic en el texto)
   */
  function seekTo(lineIdx, stepIdx = 0) {
    if (lineIdx < 0 || lineIdx >= state.timeline.length) return;

    state.currentLineIndex = lineIdx;
    state.currentStepIndex = Math.max(0, Math.min(stepIdx, state.timeline[lineIdx].steps.length - 1));
    state.currentBeatInStep = 0;
    state.currentMeasureBeat = 1;
    state.isCountingIn = false;
    showCountInIndicator(false);

    highlightCurrentStep();

    if (!state.isPlaying) {
      updatePlayPauseUI();
    }
  }

  /**
   * Salta a la línea anterior
   */
  function previousLine() {
    if (state.currentLineIndex > 0) {
      seekTo(state.currentLineIndex - 1, 0);
    } else {
      seekTo(0, 0);
    }
  }

  /**
   * Salta a la siguiente línea
   */
  function nextLine() {
    if (state.currentLineIndex + 1 < state.timeline.length) {
      seekTo(state.currentLineIndex + 1, 0);
    }
  }

  /**
   * Aplica los estilos visuales de resaltado activo y auto-scroll
   */
  function highlightCurrentStep() {
    clearAllHighlights();

    if (state.currentLineIndex < 0 || state.currentLineIndex >= state.timeline.length) {
      return;
    }

    const currentLineObj = state.timeline[state.currentLineIndex];
    if (!currentLineObj) return;

    // Resaltar la línea completa
    const lineEl = currentLineObj.lineEl;
    if (lineEl) {
      lineEl.classList.add('tempo-active-line');
    }

    // Resaltar los pasos pasados y el paso activo
    currentLineObj.steps.forEach((step, idx) => {
      const target = step.targetEl;
      if (!target) return;

      if (idx < state.currentStepIndex) {
        target.classList.add('tempo-passed-segment');
        if (step.chordEl) step.chordEl.classList.add('tempo-passed-chord');
        if (step.lyricEl) step.lyricEl.classList.add('tempo-passed-lyric');
      } else if (idx === state.currentStepIndex) {
        target.classList.add('tempo-active-segment');
        if (step.chordEl) {
          step.chordEl.classList.add('tempo-active-chord');
        } else if (step.type === 'chord-only') {
          target.classList.add('tempo-active-chord');
        }
        if (step.lyricEl) step.lyricEl.classList.add('tempo-active-lyric');
      }
    });

    // Auto-Scroll inteligente: mantener la línea activa en la zona óptima de lectura
    if (state.autoScrollEnabled && ui.sheetWrapper && lineEl) {
      scrollToActiveLine(lineEl);
    }
  }

  /**
   * Desplaza suavemente el visor para centrar la línea activa a ~35% del tope
   */
  function scrollToActiveLine(lineEl) {
    if (!ui.sheetWrapper) return;

    const wrapperRect = ui.sheetWrapper.getBoundingClientRect();
    const lineRect = lineEl.getBoundingClientRect();

    const currentScrollTop = ui.sheetWrapper.scrollTop;
    const targetOffset = lineRect.top - wrapperRect.top + currentScrollTop;
    const optimalPosition = targetOffset - (wrapperRect.height * 0.35);

    ui.sheetWrapper.scrollTo({
      top: Math.max(0, optimalPosition),
      behavior: 'smooth'
    });
  }

  /**
   * Limpia todas las clases de resaltado activo de la partitura
   */
  function clearAllHighlights() {
    if (!ui.sheetBody) return;

    ui.sheetBody.querySelectorAll('.tempo-active-line').forEach(el => el.classList.remove('tempo-active-line'));
    ui.sheetBody.querySelectorAll('.tempo-active-segment').forEach(el => el.classList.remove('tempo-active-segment'));
    ui.sheetBody.querySelectorAll('.tempo-passed-segment').forEach(el => el.classList.remove('tempo-passed-segment'));
    ui.sheetBody.querySelectorAll('.tempo-active-chord').forEach(el => el.classList.remove('tempo-active-chord'));
    ui.sheetBody.querySelectorAll('.tempo-passed-chord').forEach(el => el.classList.remove('tempo-passed-chord'));
    ui.sheetBody.querySelectorAll('.tempo-active-lyric').forEach(el => el.classList.remove('tempo-active-lyric'));
    ui.sheetBody.querySelectorAll('.tempo-passed-lyric').forEach(el => el.classList.remove('tempo-passed-lyric'));
  }

  /**
   * Actualiza el BPM (30 a 300)
   */
  function setBpm(newBpm) {
    state.bpm = Math.max(30, Math.min(300, parseInt(newBpm, 10) || 100));
    if (ui.bpmDisplay) ui.bpmDisplay.textContent = `${state.bpm} BPM`;
    if (ui.bpmSlider) ui.bpmSlider.value = state.bpm;
  }

  /**
   * Función para "Tap Tempo" (calcular BPM con toques rítmicos)
   */
  function tapTempo() {
    const now = performance.now();
    state.tapTimestamps.push(now);

    // Descartar pulsos con más de 2.5 segundos de antigüedad
    state.tapTimestamps = state.tapTimestamps.filter(t => now - t < 2500);

    if (state.tapTimestamps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < state.tapTimestamps.length; i++) {
        intervals.push(state.tapTimestamps[i] - state.tapTimestamps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      setBpm(calculatedBpm);
    }
  }

  /**
   * Configura el tipo de compás (4/4, 3/4, 2/4, 6/8)
   */
  function setTimeSignature(sigStr) {
    let beats = 4;
    if (sigStr === '3/4') beats = 3;
    else if (sigStr === '2/4') beats = 2;
    else if (sigStr === '6/8') beats = 6;
    else beats = 4;

    state.timeSignature = beats;
    if (ui.timeSignatureSelect) ui.timeSignatureSelect.value = sigStr;
    renderBeatLeds();
    buildTimeline();
  }

  /**
   * Configura la duración de cada acorde
   */
  function setBeatsPerChord(val) {
    state.beatsPerChord = val === 'auto' ? 'auto' : parseInt(val, 10);
    if (ui.beatsPerChordSelect) ui.beatsPerChordSelect.value = val;
    buildTimeline();
  }

  /**
   * Dibuja los LEDs indicadores de pulsos en el compás
   */
  function renderBeatLeds() {
    if (!ui.beatLedsContainer) return;
    ui.beatLedsContainer.innerHTML = '';

    for (let i = 1; i <= state.timeSignature; i++) {
      const dot = document.createElement('span');
      dot.className = `beat-led beat-led-${i} ${i === 1 ? 'accent' : ''}`;
      dot.textContent = i.toString();
      dot.setAttribute('data-beat-num', i);
      ui.beatLedsContainer.appendChild(dot);
    }
  }

  /**
   * Actualiza el estado visual de los LEDs de pulso
   */
  function updateBeatLeds(activeBeat) {
    if (!ui.beatLedsContainer) return;

    const leds = ui.beatLedsContainer.querySelectorAll('.beat-led');
    leds.forEach(led => {
      const beatNum = parseInt(led.getAttribute('data-beat-num'), 10);
      if (beatNum === activeBeat) {
        led.classList.add('flash');
        setTimeout(() => led.classList.remove('flash'), 160);
      } else {
        led.classList.remove('flash');
      }
    });
  }

  /**
   * Muestra u oculta el indicador visual del conteo previo
   */
  function showCountInIndicator(show) {
    if (!ui.countInIndicator) return;
    ui.countInIndicator.style.display = show ? 'inline-flex' : 'none';
  }

  /**
   * Actualiza el texto del conteo previo ("1...", "2...", etc.)
   */
  function updateCountInDisplay(beat) {
    if (!ui.countInIndicator) return;
    ui.countInIndicator.textContent = `¡${beat}!`;
    ui.countInIndicator.classList.add('pulse');
    setTimeout(() => {
      if (ui.countInIndicator) ui.countInIndicator.classList.remove('pulse');
    }, 180);
  }

  /**
   * Actualiza los botones de Play/Pause en la UI
   */
  function updatePlayPauseUI() {
    if (!ui.btnPlayPause) return;

    if (state.isPlaying) {
      ui.btnPlayPause.innerHTML = '<span>⏸</span> <span>Pausar</span>';
      ui.btnPlayPause.classList.add('btn-playing');
      ui.btnPlayPause.title = 'Pausar acompañamiento (Espacio)';
    } else if (state.isPaused) {
      ui.btnPlayPause.innerHTML = '<span>▶</span> <span>Continuar</span>';
      ui.btnPlayPause.classList.remove('btn-playing');
      ui.btnPlayPause.title = 'Reanudar acompañamiento (Espacio)';
    } else {
      ui.btnPlayPause.innerHTML = '<span>▶</span> <span>Acompañar</span>';
      ui.btnPlayPause.classList.remove('btn-playing');
      ui.btnPlayPause.title = 'Iniciar acompañamiento con tempo y metrónomo';
    }
  }

  /**
   * Alterna la visibilidad de la barra flotante/dock de Acompañamiento
   */
  function toggleCompanionBar(forceState) {
    if (!ui.companionBar) return;

    const isVisible = ui.companionBar.classList.contains('open');
    const willShow = typeof forceState === 'boolean' ? forceState : !isVisible;

    if (willShow) {
      ui.companionBar.classList.add('open');
      if (ui.btnToggleCompanion) ui.btnToggleCompanion.classList.add('active');
      buildTimeline();
    } else {
      ui.companionBar.classList.remove('open');
      if (ui.btnToggleCompanion) ui.btnToggleCompanion.classList.remove('active');
      if (state.isPlaying) {
        pause();
      }
    }
  }

  /**
   * Enlaza todos los eventos del DOM para el panel de tempo
   */
  function bindUIEvents() {
    // Botón principal en la barra de herramientas para abrir/cerrar el panel de tempo
    if (ui.btnToggleCompanion) {
      ui.btnToggleCompanion.addEventListener('click', () => toggleCompanionBar());
    }

    // Botones de control de reproducción
    if (ui.btnPlayPause) {
      ui.btnPlayPause.addEventListener('click', () => togglePlayPause());
    }
    if (ui.btnStop) {
      ui.btnStop.addEventListener('click', () => stop());
    }
    if (ui.btnPrevLine) {
      ui.btnPrevLine.addEventListener('click', () => previousLine());
    }
    if (ui.btnNextLine) {
      ui.btnNextLine.addEventListener('click', () => nextLine());
    }

    // Control de BPM (+, -, Slider, Tap)
    if (ui.btnBpmInc) {
      ui.btnBpmInc.addEventListener('click', () => setBpm(state.bpm + 2));
    }
    if (ui.btnBpmDec) {
      ui.btnBpmDec.addEventListener('click', () => setBpm(state.bpm - 2));
    }
    if (ui.bpmSlider) {
      ui.bpmSlider.addEventListener('input', (e) => setBpm(e.target.value));
    }
    if (ui.btnTapTempo) {
      ui.btnTapTempo.addEventListener('click', () => tapTempo());
    }

    // Selector de Compás
    if (ui.timeSignatureSelect) {
      ui.timeSignatureSelect.addEventListener('change', (e) => setTimeSignature(e.target.value));
    }

    // Selector de tiempos por acorde
    if (ui.beatsPerChordSelect) {
      ui.beatsPerChordSelect.addEventListener('change', (e) => setBeatsPerChord(e.target.value));
    }

    // Toggle de Sonido del Metrónomo
    if (ui.btnToggleSound) {
      ui.btnToggleSound.addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        ui.btnToggleSound.classList.toggle('active', state.soundEnabled);
        ui.btnToggleSound.innerHTML = state.soundEnabled ? '<span>🔊</span> Sonido' : '<span>🔇</span> Mudo';
        ui.btnToggleSound.title = state.soundEnabled ? 'Metrónomo con sonido activo' : 'Metrónomo en silencio (solo visual)';
        if (state.soundEnabled) getAudioContext();
      });
    }

    // Toggle de Conteo previo
    if (ui.btnToggleCountIn) {
      ui.btnToggleCountIn.addEventListener('click', () => {
        state.countInEnabled = !state.countInEnabled;
        ui.btnToggleCountIn.classList.toggle('active', state.countInEnabled);
      });
    }

    // Clic interactivo en la partitura para saltar inmediatamente a esa línea / acorde
    if (ui.sheetBody) {
      ui.sheetBody.addEventListener('click', (e) => {
        // Ignorar si el usuario está seleccionando texto
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) return;

        const targetLine = e.target.closest('[data-tempo-line-idx]');
        if (targetLine) {
          const lineIdx = parseInt(targetLine.getAttribute('data-tempo-line-idx'), 10);
          const targetStep = e.target.closest('[data-tempo-step-idx]');
          const stepIdx = targetStep ? parseInt(targetStep.getAttribute('data-tempo-step-idx'), 10) : 0;

          if (!isNaN(lineIdx)) {
            seekTo(lineIdx, stepIdx);
            if (!state.isPlaying) {
              start();
            }
          }
        }
      });
    }

    // Atajos de teclado: Espacio para reproducir/pausar (cuando no se escribe en textarea/input)
    document.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'textarea' || activeTag === 'input' || activeTag === 'select') return;

      if (e.code === 'Space' && ui.companionBar && ui.companionBar.classList.contains('open')) {
        e.preventDefault();
        togglePlayPause();
      }
    });
  }

  /**
   * Inicializa el módulo TempoCompanion
   */
  function init(customUiConfig) {
    ui = Object.assign({}, ui, customUiConfig);
    renderBeatLeds();
    bindUIEvents();
    setBpm(state.bpm);
  }

  return {
    init,
    start,
    pause,
    stop,
    togglePlayPause,
    seekTo,
    previousLine,
    nextLine,
    setBpm,
    setTimeSignature,
    setBeatsPerChord,
    buildTimeline,
    toggleCompanionBar,
    getState: () => ({ ...state })
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TempoCompanion;
}
