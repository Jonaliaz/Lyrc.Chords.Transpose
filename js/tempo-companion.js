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
   * Guiada exclusivamente por los acordes y de forma continua entre líneas.
   * Omite por completo encabezados de sección ([Verso], [Coro], etc.) para no detener el ritmo.
   */
  function buildTimeline() {
    if (!ui.sheetBody) return [];

    // Ignorar por completo los títulos de sección ([Verso], [Coro], [Intro], etc.)
    const lineElements = Array.from(
      ui.sheetBody.querySelectorAll('.chord-only-line, .song-line:not(.song-line-empty)')
    );

    // 1. Recolectar todos los elementos y acordes en orden secuencial
    const allItems = [];

    lineElements.forEach((lineEl, lineIdx) => {
      lineEl.setAttribute('data-tempo-line-idx', lineIdx);

      if (lineEl.classList.contains('chord-only-line')) {
        const chordBadges = Array.from(lineEl.querySelectorAll('.chord-badge'));
        chordBadges.forEach((badge, segIdx) => {
          const chordText = badge.textContent.trim();
          if (chordText.length > 0) {
            allItems.push({
              type: 'chord-badge',
              el: badge,
              lineEl,
              lineIdx,
              segIdx,
              hasChord: true,
              chordText,
              chordBadgeEl: badge,
              lyricSpanEl: null
            });
          }
        });
      } else if (lineEl.classList.contains('song-line')) {
        const pairs = Array.from(lineEl.querySelectorAll('.chord-lyric-pair'));
        pairs.forEach((pair, segIdx) => {
          const chordBadge = pair.querySelector('.chord-badge');
          const hasChord = chordBadge && !chordBadge.classList.contains('empty-chord') && chordBadge.textContent.trim().length > 0;
          const lyricSpan = pair.querySelector('.lyric-text');

          allItems.push({
            type: 'pair',
            el: pair,
            lineEl,
            lineIdx,
            segIdx,
            hasChord,
            chordText: hasChord ? chordBadge.textContent.trim() : null,
            chordBadgeEl: hasChord ? chordBadge : null,
            lyricSpanEl: lyricSpan
          });
        });
      }
    });

    // 2. Localizar las posiciones de todos los acordes en allItems
    const chordIndices = [];
    allItems.forEach((item, idx) => {
      if (item.hasChord) {
        chordIndices.push(idx);
      }
    });

    const timeline = [];
    let introPairs = [];

    if (chordIndices.length > 0) {
      // Elementos previos al primer acorde (anacrusa / letra introductoria)
      if (chordIndices[0] > 0) {
        introPairs = allItems.slice(0, chordIndices[0]).map(it => it.el);
        introPairs.forEach(el => {
          el.setAttribute('data-tempo-step-idx', -1);
        });
      }

      const beatsPerChord = calculateBeatsForChordCount(chordIndices.length);

      chordIndices.forEach((itemIdx, stepIdx) => {
        const chordItem = allItems[itemIdx];
        const isLastChord = stepIdx === chordIndices.length - 1;
        const nextChordIdx = isLastChord ? allItems.length : chordIndices[stepIdx + 1];

        // Rango continuo desde el acorde actual hasta antes del siguiente acorde
        // (cubre desde la posición del acorde actual hasta la palabra antecesora del siguiente acorde,
        // incluso si abarca la mitad de una línea y la mitad de la siguiente)
        const stepItems = allItems.slice(itemIdx, nextChordIdx);

        const pairEls = stepItems.map(it => it.el);
        const lyricEls = stepItems.map(it => it.lyricSpanEl).filter(Boolean);
        const lineEls = Array.from(new Set(stepItems.map(it => it.lineEl)));

        pairEls.forEach(el => {
          el.setAttribute('data-tempo-step-idx', stepIdx);
        });

        timeline.push({
          stepIdx,
          type: chordItem.type === 'chord-badge' ? 'chord-only' : 'chord-group',
          chord: chordItem.chordText,
          chordEl: chordItem.chordBadgeEl,
          pairEls,
          lyricEls,
          lineEls,
          primaryLineEl: chordItem.lineEl,
          lyric: lyricEls.map(l => l.textContent).join(''),
          beats: beatsPerChord
        });
      });
    } else if (lineElements.length > 0) {
      // Si la canción no tiene ningún acorde, cada línea es 1 paso de 1 compás
      lineElements.forEach((lineEl, lineIdx) => {
        const pairs = Array.from(lineEl.querySelectorAll('.chord-lyric-pair'));
        const pairEls = pairs.length > 0 ? pairs : [lineEl];
        const lyricEls = pairs.map(p => p.querySelector('.lyric-text')).filter(Boolean);

        pairEls.forEach(el => {
          el.setAttribute('data-tempo-step-idx', lineIdx);
        });

        timeline.push({
          stepIdx: lineIdx,
          type: 'lyric-only-line',
          chord: null,
          chordEl: null,
          pairEls,
          lyricEls,
          lineEls: [lineEl],
          primaryLineEl: lineEl,
          lyric: lyricEls.map(l => l.textContent).join(''),
          beats: state.timeSignature
        });
      });
    }

    state.timeline = timeline;
    state.introPairs = introPairs;
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
    // Cada acorde dura 1 compás completo (ej. 4 tiempos en 4/4)
    // El cambio de acorde se produce en el pulso 1 del siguiente compás
    return state.timeSignature;
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
    if (state.currentStepIndex === -1) {
      if (state.countInEnabled) {
        startCountIn();
        return;
      } else {
        state.currentStepIndex = 0;
        state.currentBeatInStep = 0;
        state.currentMeasureBeat = 1;
      }
    }

    updatePlayPauseUI();
    highlightCurrentStep();
    scheduleNextBeat();
  }

  /**
   * Inicia el conteo previo (pre-roll / 1-2-3-4)
   */
  function startCountIn() {
    state.isCountingIn = true;
    state.countInBeat = 0;
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

    // 1. Manejar conteo previo
    if (state.isCountingIn) {
      state.countInBeat++;
      const isAccented = state.countInBeat === 1;
      playClickSound(isAccented);
      updateBeatLeds(state.countInBeat);
      updateCountInDisplay(state.countInBeat);

      if (state.countInBeat >= state.timeSignature) {
        // Conteo finalizado -> iniciar primer compás en el siguiente pulso
        state.isCountingIn = false;
        showCountInIndicator(false);
        state.currentStepIndex = 0;
        state.currentBeatInStep = 0;
        state.currentMeasureBeat = 1;
      }

      state.timerId = setTimeout(scheduleNextBeat, intervalMs);
      return;
    }

    // 2. Verificar si el paso/acorde actual completó su duración antes de este pulso
    // Esto asegura que el cambio al segundo acorde ocurra exactamente en el pulso 1 del siguiente compás
    const currentStep = state.timeline[state.currentStepIndex];
    if (currentStep) {
      const stepDurationBeats = currentStep.beats || state.timeSignature;

      if (state.currentBeatInStep >= stepDurationBeats) {
        advanceToNextStep();
      }
    }

    if (!state.isPlaying) return;

    // 3. Ejecución del pulso actual
    const isAccented = state.currentMeasureBeat === 1;
    playClickSound(isAccented);
    updateBeatLeds(state.currentMeasureBeat);
    highlightCurrentStep();

    // 4. Incrementar contadores para el pulso
    state.currentBeatInStep++;

    state.currentMeasureBeat++;
    if (state.currentMeasureBeat > state.timeSignature) {
      state.currentMeasureBeat = 1;
    }

    // Programar el siguiente pulso
    state.timerId = setTimeout(scheduleNextBeat, intervalMs);
  }

  /**
   * Avanza al siguiente paso (acorde)
   */
  function advanceToNextStep() {
    state.currentBeatInStep = 0;

    if (state.currentStepIndex + 1 < state.timeline.length) {
      state.currentStepIndex++;
    } else {
      // Llegamos al final de la canción
      stop();
    }
  }

  /**
   * Salta a un paso/acorde específico
   */
  function seekTo(stepIdx = 0) {
    if (stepIdx < 0 || stepIdx >= state.timeline.length) return;

    state.currentStepIndex = stepIdx;
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
   * Salta a la línea / sección anterior
   */
  function previousLine() {
    if (state.currentStepIndex <= 0) {
      seekTo(0);
      return;
    }
    const currentStep = state.timeline[state.currentStepIndex];
    const currentLine = currentStep ? currentStep.primaryLineEl : null;
    let targetIdx = state.currentStepIndex - 1;
    while (targetIdx > 0 && state.timeline[targetIdx].primaryLineEl === currentLine) {
      targetIdx--;
    }
    seekTo(targetIdx);
  }

  /**
   * Salta a la línea / sección siguiente
   */
  function nextLine() {
    if (state.currentStepIndex >= state.timeline.length - 1) return;
    const currentStep = state.timeline[state.currentStepIndex];
    const currentLine = currentStep ? currentStep.primaryLineEl : null;
    let targetIdx = state.currentStepIndex + 1;
    while (targetIdx < state.timeline.length - 1 && state.timeline[targetIdx].primaryLineEl === currentLine) {
      targetIdx++;
    }
    seekTo(targetIdx);
  }

  /**
   * Aplica los estilos visuales de resaltado activo continuo y auto-scroll
   */
  function highlightCurrentStep() {
    clearAllHighlights();

    if (state.currentStepIndex < 0 || state.currentStepIndex >= state.timeline.length) {
      return;
    }

    const currentStep = state.timeline[state.currentStepIndex];
    if (!currentStep) return;

    // Marcar pares iniciales antes del primer acorde como ya leídos/pasados
    if (state.introPairs && state.introPairs.length > 0) {
      state.introPairs.forEach(p => {
        p.classList.add('tempo-passed-segment');
        const lyric = p.querySelector('.lyric-text');
        if (lyric) lyric.classList.add('tempo-passed-lyric');
      });
    }

    // Resaltar los pasos pasados y el paso activo continuo
    state.timeline.forEach((step, idx) => {
      if (idx < state.currentStepIndex) {
        step.pairEls.forEach(p => p.classList.add('tempo-passed-segment'));
        if (step.chordEl) step.chordEl.classList.add('tempo-passed-chord');
        step.lyricEls.forEach(l => l.classList.add('tempo-passed-lyric'));
      } else if (idx === state.currentStepIndex) {
        // Resaltar todos los elementos de este acorde (incluyendo los que cruzan de línea)
        step.pairEls.forEach(p => p.classList.add('tempo-active-segment'));
        if (step.chordEl) {
          step.chordEl.classList.add('tempo-active-chord');
        } else if (step.type === 'chord-only') {
          if (step.chordEl) step.chordEl.classList.add('tempo-active-chord');
        }
        step.lyricEls.forEach(l => l.classList.add('tempo-active-lyric'));

        // Resaltar todas las líneas abarcadas por este paso
        step.lineEls.forEach(l => l.classList.add('tempo-active-line'));
      }
    });

    // Auto-Scroll inteligente: mantener la línea activa en la zona óptima de lectura
    if (state.autoScrollEnabled && ui.sheetWrapper && currentStep.primaryLineEl) {
      scrollToActiveLine(currentStep.primaryLineEl);
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
      ui.btnPlayPause.innerHTML = '<span>Pausar</span>';
      ui.btnPlayPause.classList.add('btn-playing');
      ui.btnPlayPause.title = 'Pausar acompañamiento (Espacio)';
    } else if (state.isPaused) {
      ui.btnPlayPause.innerHTML = '<span>Continuar</span>';
      ui.btnPlayPause.classList.remove('btn-playing');
      ui.btnPlayPause.title = 'Reanudar acompañamiento (Espacio)';
    } else {
      ui.btnPlayPause.innerHTML = '<span>Acompañar</span>';
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
        ui.btnToggleSound.innerHTML = state.soundEnabled ? '<span>Sonido</span>' : '<span>Mudo</span>';
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

    // Clic interactivo en la partitura para saltar inmediatamente a ese acorde
    if (ui.sheetBody) {
      ui.sheetBody.addEventListener('click', (e) => {
        // Ignorar si el usuario está seleccionando texto
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) return;

        const targetStep = e.target.closest('[data-tempo-step-idx]');
        if (targetStep) {
          const stepIdx = parseInt(targetStep.getAttribute('data-tempo-step-idx'), 10);
          if (!isNaN(stepIdx) && stepIdx >= 0) {
            seekTo(stepIdx);
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
    getState: () => ({
      ...state,
      currentLineIndex: (state.currentStepIndex >= 0 && state.timeline[state.currentStepIndex] && state.timeline[state.currentStepIndex].primaryLineEl)
        ? parseInt(state.timeline[state.currentStepIndex].primaryLineEl.getAttribute('data-tempo-line-idx'), 10)
        : -1
    })
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TempoCompanion;
}
