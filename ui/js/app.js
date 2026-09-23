/**
 * LyrChords Transposer - Lógica de la Aplicación
 */

(function () {
  'use strict';

  // Referencias a elementos del DOM
  const elements = {
    // Transposición
    btnTransposeDown: document.getElementById('btnTransposeDown'),
    btnTransposeUp: document.getElementById('btnTransposeUp'),
    btnResetTranspose: document.getElementById('btnResetTranspose'),
    transposeDisplay: document.getElementById('transposeDisplay'),
    targetKeySelect: document.getElementById('targetKeySelect'),
    capoSelect: document.getElementById('capoSelect'),
    btnNotationEnglish: document.getElementById('btnNotationEnglish'),
    btnNotationLatin: document.getElementById('btnNotationLatin'),
    btnAccidentalSharp: document.getElementById('btnAccidentalSharp'),
    btnAccidentalFlat: document.getElementById('btnAccidentalFlat'),

    // Editor
    songInput: document.getElementById('songInput'),
    btnFormatTwoLines: document.getElementById('btnFormatTwoLines'),
    btnOpenInsertModal: document.getElementById('btnOpenInsertModal'),
    quickChordContainer: document.getElementById('quickChordContainer'),
    charCountDisplay: document.getElementById('charCountDisplay'),

    // Visor / Partitura
    songSheet: document.getElementById('songSheet'),
    sheetContainerWrapper: document.getElementById('sheetContainerWrapper'),
    sheetBody: document.getElementById('sheetBody'),
    sheetSongTitle: document.getElementById('sheetSongTitle'),
    sheetSongArtist: document.getElementById('sheetSongArtist'),
    sheetKeyBadge: document.getElementById('sheetKeyBadge'),
    sheetCapoBadge: document.getElementById('sheetCapoBadge'),
    sheetTransposeBadge: document.getElementById('sheetTransposeBadge'),

    // Visor Controles
    btnViewerTransposeDown: document.getElementById('btnViewerTransposeDown'),
    btnViewerTransposeUp: document.getElementById('btnViewerTransposeUp'),
    btnViewerResetTranspose: document.getElementById('btnViewerResetTranspose'),
    viewerTransposeDisplay: document.getElementById('viewerTransposeDisplay'),
    viewerKeyDisplay: document.getElementById('viewerKeyDisplay'),
    btnFontDec: document.getElementById('btnFontDec'),
    btnFontInc: document.getElementById('btnFontInc'),
    fontSizeDisplay: document.getElementById('fontSizeDisplay'),
    btnAutoScroll: document.getElementById('btnAutoScroll'),
    scrollSpeedRange: document.getElementById('scrollSpeedRange'),
    btnToggleFullscreen: document.getElementById('btnToggleFullscreen'),
    viewerPanel: document.getElementById('viewerPanel'),

    // Acciones Generales
    exampleSelector: document.getElementById('exampleSelector'),
    btnNewSong: document.getElementById('btnNewSong'),
    btnExportPdf: document.getElementById('btnExportPdf'),
    btnPrint: document.getElementById('btnPrint'),
    btnToggleTheme: document.getElementById('btnToggleTheme'),

    // Modal
    chordModal: document.getElementById('chordModal'),
    btnCloseModal: document.getElementById('btnCloseModal'),
    btnCancelModal: document.getElementById('btnCancelModal'),
    btnConfirmInsertChord: document.getElementById('btnConfirmInsertChord'),
    modalRootNote: document.getElementById('modalRootNote'),
    modalChordQuality: document.getElementById('modalChordQuality'),
    modalBassNote: document.getElementById('modalBassNote'),
    modalChordPreview: document.getElementById('modalChordPreview')
  };

  // Estado de la aplicación
  const state = {
    semitones: 0,
    capo: 0,
    notation: 'english', // 'english' | 'latin'
    preferSharps: true,
    fontSize: 17,
    autoScrollRunning: false,
    autoScrollInterval: null,
    currentKey: 'C',
    originalKey: 'C'
  };

  // Lista de tonalidades estándar para los selectores
  const ALL_KEYS = [
    { eng: 'C', lat: 'Do' },
    { eng: 'C#', lat: 'Do#' },
    { eng: 'Db', lat: 'Reb' },
    { eng: 'D', lat: 'Re' },
    { eng: 'D#', lat: 'Re#' },
    { eng: 'Eb', lat: 'Mib' },
    { eng: 'E', lat: 'Mi' },
    { eng: 'F', lat: 'Fa' },
    { eng: 'F#', lat: 'Fa#' },
    { eng: 'Gb', lat: 'Solb' },
    { eng: 'G', lat: 'Sol' },
    { eng: 'Ab', lat: 'Lab' },
    { eng: 'A', lat: 'La' },
    { eng: 'A#', lat: 'La#' },
    { eng: 'Bb', lat: 'Sib' },
    { eng: 'B', lat: 'Si' },
    // Menores comunes
    { eng: 'Am', lat: 'Lam' },
    { eng: 'Bm', lat: 'Sim' },
    { eng: 'Cm', lat: 'Dom' },
    { eng: 'Dm', lat: 'Rem' },
    { eng: 'Em', lat: 'Mim' },
    { eng: 'Fm', lat: 'Fam' },
    { eng: 'Gm', lat: 'Solm' },
    { eng: 'F#m', lat: 'Fa#m' }
  ];

  /**
   * Inicialización del programa
   */
  function init() {
    populateKeySelector();
    bindEvents();

    // Cargar canción guardada o el ejemplo por defecto
    const savedSong = localStorage.getItem('lyrchords_current_song');
    if (savedSong && savedSong.trim().length > 0) {
      elements.songInput.value = savedSong;
    } else {
      loadExample('musica-ligera');
    }

    render();
  }

  /**
   * Llena las opciones del selector de tonalidad
   */
  function populateKeySelector() {
    elements.targetKeySelect.innerHTML = '';
    
    // Agrupar por mayores y menores
    const optGroupMajor = document.createElement('optgroup');
    optGroupMajor.label = 'Tonalidades Mayores';
    const optGroupMinor = document.createElement('optgroup');
    optGroupMinor.label = 'Tonalidades Menores';

    ALL_KEYS.forEach(k => {
      const option = document.createElement('option');
      option.value = k.eng;
      const label = state.notation === 'latin' ? `${k.lat} (${k.eng})` : `${k.eng} (${k.lat})`;
      option.textContent = label;

      if (k.eng.endsWith('m')) {
        optGroupMinor.appendChild(option);
      } else {
        optGroupMajor.appendChild(option);
      }
    });

    elements.targetKeySelect.appendChild(optGroupMajor);
    elements.targetKeySelect.appendChild(optGroupMinor);
  }

  /**
   * Enlaza todos los escuchadores de eventos
   */
  function bindEvents() {
    // Entrada de texto en el editor con auto-guardado
    elements.songInput.addEventListener('input', () => {
      localStorage.setItem('lyrchords_current_song', elements.songInput.value);
      updateSongStats();
      render();
    });

    // Botones de transposición
    elements.btnTransposeUp.addEventListener('click', () => changeTranspose(1));
    elements.btnTransposeDown.addEventListener('click', () => changeTranspose(-1));
    elements.btnResetTranspose.addEventListener('click', () => resetTranspose());

    // Cambio en selector de tono directo
    elements.targetKeySelect.addEventListener('change', (e) => {
      const selectedKey = e.target.value;
      const origKeyClean = state.originalKey.replace(/m$/, '');
      const targetClean = selectedKey.replace(/m$/, '');
      
      const origSemi = ChordTransposer.getSemitone(origKeyClean);
      const targetSemi = ChordTransposer.getSemitone(targetClean);

      if (origSemi !== -1 && targetSemi !== -1) {
        let diff = (targetSemi - origSemi) % 12;
        if (diff > 6) diff -= 12;
        if (diff < -5) diff += 12;
        setTranspose(diff);
      }
    });

    // Selector de Cejilla / Capo
    elements.capoSelect.addEventListener('change', (e) => {
      state.capo = parseInt(e.target.value, 10) || 0;
      updateCapoBadge();
    });

    // Notación (Inglés vs Latino)
    elements.btnNotationEnglish.addEventListener('click', () => {
      state.notation = 'english';
      elements.btnNotationEnglish.classList.add('active');
      elements.btnNotationLatin.classList.remove('active');
      populateKeySelector();
      render();
    });

    elements.btnNotationLatin.addEventListener('click', () => {
      state.notation = 'latin';
      elements.btnNotationLatin.classList.add('active');
      elements.btnNotationEnglish.classList.remove('active');
      populateKeySelector();
      render();
    });

    // Alteraciones (# vs b)
    elements.btnAccidentalSharp.addEventListener('click', () => {
      state.preferSharps = true;
      elements.btnAccidentalSharp.classList.add('active');
      elements.btnAccidentalFlat.classList.remove('active');
      render();
    });

    elements.btnAccidentalFlat.addEventListener('click', () => {
      state.preferSharps = false;
      elements.btnAccidentalFlat.classList.add('active');
      elements.btnAccidentalSharp.classList.remove('active');
      render();
    });

    // Formatear dos líneas de acordes clásicos
    elements.btnFormatTwoLines.addEventListener('click', () => {
      const text = elements.songInput.value;
      const converted = ChordTransposer.mergeChordsAndLyricsToChordPro(text);
      elements.songInput.value = converted;
      localStorage.setItem('lyrchords_current_song', converted);
      render();
      alert('¡Listo! Se han alineado los acordes sobre la letra con formato [Acorde].');
    });

    // Zoom de fuente
    elements.btnFontInc.addEventListener('click', () => adjustFontSize(1));
    elements.btnFontDec.addEventListener('click', () => adjustFontSize(-1));

    // Auto-Scroll
    elements.btnAutoScroll.addEventListener('click', toggleAutoScroll);

    // Pantalla completa / Modo escenario
    elements.btnToggleFullscreen.addEventListener('click', toggleFullscreen);

    // Selector de ejemplos
    elements.exampleSelector.addEventListener('change', (e) => {
      if (e.target.value) {
        loadExample(e.target.value);
        e.target.value = '';
      }
    });

    // Nueva Canción
    elements.btnNewSong.addEventListener('click', () => {
      if (confirm('¿Deseas comenzar una nueva canción en blanco?')) {
        loadExample('plantilla-vacia');
      }
    });

    // Exportar / Descargar PDF de la partitura
    if (elements.btnExportPdf) {
      elements.btnExportPdf.addEventListener('click', downloadSheetAsPdf);
    }

    // Imprimir
    elements.btnPrint.addEventListener('click', () => window.print());

    // Tema Claro / Oscuro
    elements.btnToggleTheme.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
    });

    // Botones de transposición rápida en el visor (Modo Escenario)
    if (elements.btnViewerTransposeUp) {
      elements.btnViewerTransposeUp.addEventListener('click', () => changeTranspose(1));
    }
    if (elements.btnViewerTransposeDown) {
      elements.btnViewerTransposeDown.addEventListener('click', () => changeTranspose(-1));
    }
    if (elements.btnViewerResetTranspose) {
      elements.btnViewerResetTranspose.addEventListener('click', () => resetTranspose());
    }

    // Salir de pantalla completa con tecla Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && elements.viewerPanel.classList.contains('fullscreen-viewer')) {
        toggleFullscreen();
      }
    });

    // Modal de inserción de acordes
    elements.btnOpenInsertModal.addEventListener('click', openChordModal);
    elements.btnCloseModal.addEventListener('click', closeChordModal);
    elements.btnCancelModal.addEventListener('click', closeChordModal);
    elements.btnConfirmInsertChord.addEventListener('click', confirmInsertChord);

    // Actualizar vista previa en el modal al cambiar sus campos
    elements.modalRootNote.addEventListener('change', updateModalPreview);
    elements.modalChordQuality.addEventListener('change', updateModalPreview);
    elements.modalBassNote.addEventListener('change', updateModalPreview);
  }

  /**
   * Cambia el semitono relativo (+1, -1)
   */
  function changeTranspose(delta) {
    setTranspose(state.semitones + delta);
  }

  /**
   * Establece un valor de transposición absoluto
   */
  function setTranspose(val) {
    state.semitones = val;
    updateTransposeUI();
    render();
  }

  /**
   * Restablece la transposición al original (0)
   */
  function resetTranspose() {
    setTranspose(0);
  }

  /**
   * Actualiza los indicadores visuales de transposición
   */
  /**
   * Actualiza los indicadores visuales de transposición
   */
  function updateTransposeUI() {
    const s = state.semitones;
    const sign = s > 0 ? `+${s}` : `${s}`;
    elements.transposeDisplay.textContent = sign;
    
    if (s !== 0) {
      elements.transposeDisplay.classList.add('shifted');
      elements.sheetTransposeBadge.textContent = `${sign} Semitonos`;
    } else {
      elements.transposeDisplay.classList.remove('shifted');
      elements.sheetTransposeBadge.textContent = 'Original (0)';
    }

    // Calcular la tonalidad resultante
    const effectiveKey = ChordTransposer.transposeChord(state.originalKey, state.semitones, {
      preferSharps: state.preferSharps,
      targetNotation: state.notation
    });
    state.currentKey = effectiveKey;
    elements.sheetKeyBadge.textContent = `Tono: ${effectiveKey}`;

    // Sincronizar controles en el visor (Modo Escenario / Pantalla completa)
    if (elements.viewerTransposeDisplay) {
      elements.viewerTransposeDisplay.textContent = sign;
      if (s !== 0) {
        elements.viewerTransposeDisplay.classList.add('shifted');
      } else {
        elements.viewerTransposeDisplay.classList.remove('shifted');
      }
    }
    if (elements.viewerKeyDisplay) {
      elements.viewerKeyDisplay.textContent = `Tono: ${effectiveKey}`;
    }

    // Sincronizar selector de tono destino si coincide
    const matchedKey = ALL_KEYS.find(k => k.eng === ChordTransposer.transposeChord(state.originalKey, state.semitones, { targetNotation: 'english' }));
    if (matchedKey) {
      elements.targetKeySelect.value = matchedKey.eng;
    }
  }

  /**
   * Actualiza el badge del Capo
   */
  function updateCapoBadge() {
    if (state.capo > 0) {
      elements.sheetCapoBadge.textContent = `Cejilla: Traste ${state.capo}`;
      elements.sheetCapoBadge.style.display = 'inline-block';
    } else {
      elements.sheetCapoBadge.textContent = 'Sin Cejilla';
    }
  }

  /**
   * Ajusta el tamaño de fuente de la partitura
   */
  function adjustFontSize(delta) {
    state.fontSize = Math.max(12, Math.min(32, state.fontSize + delta));
    elements.songSheet.style.fontSize = `${state.fontSize}px`;
    elements.fontSizeDisplay.textContent = `${state.fontSize}px`;
  }

  let autoScrollAnimId = null;
  let lastTimestamp = null;
  let currentScrollPos = 0;

  /**
   * Alterna el Auto-Scroll fluido para tocar sin manos
   */
  function toggleAutoScroll() {
    if (state.autoScrollRunning) {
      stopAutoScroll();
    } else {
      startAutoScroll();
    }
  }

  /**
   * Inicia el desplazamiento automático a 60fps con cálculo delta-time
   */
  function startAutoScroll() {
    state.autoScrollRunning = true;
    currentScrollPos = elements.sheetContainerWrapper.scrollTop;
    lastTimestamp = performance.now();

    elements.btnAutoScroll.textContent = '⏸ Pausar';
    elements.btnAutoScroll.classList.add('btn-success');

    function scrollStep(timestamp) {
      if (!state.autoScrollRunning) return;

      const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
      lastTimestamp = timestamp;

      const speedVal = parseFloat(elements.scrollSpeedRange.value) || 3;
      // Escala cómoda de velocidad: nivel 1 (~18px/s), nivel 3 (~44px/s), nivel 10 (~130px/s)
      const pixelsPerSecond = speedVal * 12 + 8;

      // Si el usuario scrolleó manualmente con mouse wheel o touch, sincronizar acumulador
      const actualScroll = elements.sheetContainerWrapper.scrollTop;
      if (Math.abs(actualScroll - currentScrollPos) > 20) {
        currentScrollPos = actualScroll;
      }

      currentScrollPos += pixelsPerSecond * dt;
      elements.sheetContainerWrapper.scrollTop = currentScrollPos;

      const maxScroll = elements.sheetContainerWrapper.scrollHeight - elements.sheetContainerWrapper.clientHeight;
      if (currentScrollPos >= maxScroll - 2) {
        stopAutoScroll();
        return;
      }

      autoScrollAnimId = requestAnimationFrame(scrollStep);
    }

    autoScrollAnimId = requestAnimationFrame(scrollStep);
  }

  /**
   * Detiene el desplazamiento automático
   */
  function stopAutoScroll() {
    state.autoScrollRunning = false;
    if (autoScrollAnimId) {
      cancelAnimationFrame(autoScrollAnimId);
      autoScrollAnimId = null;
    }
    elements.btnAutoScroll.textContent = '▶ Auto-Scroll';
    elements.btnAutoScroll.classList.remove('btn-success');
  }

  /**
   * Alterna pantalla completa / modo escenario
   */
  function toggleFullscreen() {
    elements.viewerPanel.classList.toggle('fullscreen-viewer');
    const isFull = elements.viewerPanel.classList.contains('fullscreen-viewer');
    elements.btnToggleFullscreen.textContent = isFull ? '✕ Salir de Escenario' : '⛶ Modo Escenario';
  }

  /**
   * Carga una canción de los ejemplos disponibles
   */
  function loadExample(exampleId) {
    if (typeof SONG_EXAMPLES === 'undefined') return;
    const example = SONG_EXAMPLES.find(ex => ex.id === exampleId);
    if (!example) return;

    elements.songInput.value = example.content;
    state.originalKey = example.key || 'C';
    state.semitones = 0;
    state.capo = 0;
    elements.capoSelect.value = '0';
    updateCapoBadge();
    updateTransposeUI();
    render();
  }

  /**
   * Detecta metadatos y primera tonalidad de la canción
   */
  function extractMetadata(text) {
    let title = 'Canción Sin Título';
    let artist = '';
    let key = '';

    const lines = text.split('\n');
    for (const line of lines) {
      const titleMatch = line.match(/^\{\s*title:\s*(.*?)\s*\}$/i);
      if (titleMatch) title = titleMatch[1];

      const artistMatch = line.match(/^\{\s*artist:\s*(.*?)\s*\}$/i);
      if (artistMatch) artist = artistMatch[1];

      const keyMatch = line.match(/^\{\s*key:\s*(.*?)\s*\}$/i);
      if (keyMatch) key = keyMatch[1];
    }

    // Si no tiene {key:...}, buscar el primer acorde de la canción como referencia
    if (!key) {
      const firstChordMatch = text.match(/\[([A-G][b#]?[a-zA-Z0-9#b\+]*)\]/);
      if (firstChordMatch) {
        key = firstChordMatch[1];
      }
    }

    return { title, artist, key };
  }

  /**
   * Actualiza las estadísticas del texto (versos y palabras)
   */
  function updateSongStats() {
    const text = elements.songInput.value;
    const lines = text.split('\n').filter(l => l.trim().length > 0 && !l.startsWith('{'));
    const words = text.replace(/\[.*?\]/g, '').trim().split(/\s+/).filter(w => w.length > 0);
    elements.charCountDisplay.textContent = `${lines.length} versos | ${words.length} palabras`;
  }

  /**
   * Renderiza la partitura y la paleta de acordes
   */
  function render() {
    const rawText = elements.songInput.value;
    const meta = extractMetadata(rawText);

    // Actualizar metadatos
    elements.sheetSongTitle.textContent = meta.title;
    elements.sheetSongArtist.textContent = meta.artist;
    elements.sheetSongArtist.style.display = meta.artist ? 'block' : 'none';

    if (meta.key && meta.key !== state.originalKey) {
      state.originalKey = meta.key;
    }

    updateTransposeUI();
    updateQuickChords(state.currentKey || state.originalKey);

    // Parsear el texto de la canción
    const parsedLines = ChordTransposer.parseSong(rawText);
    renderSheetLines(parsedLines);
  }

  /**
   * Renderiza las líneas con acordes encima de las letras
   */
  function renderSheetLines(parsedLines) {
    elements.sheetBody.innerHTML = '';

    const options = {
      preferSharps: state.preferSharps,
      targetNotation: state.notation
    };

    parsedLines.forEach(item => {
      // Ignorar directivas de metadatos en el cuerpo
      if (item.type === 'directive') return;

      // Secciones como [Intro], [Coro], [Verso 1]
      if (item.type === 'section') {
        const secDiv = document.createElement('div');
        secDiv.className = 'song-section-title';
        secDiv.textContent = item.text.replace(/\[|\]/g, '');
        elements.sheetBody.appendChild(secDiv);
        return;
      }

      // Líneas donde solo hay acordes (Intro, solos, etc.)
      if (item.type === 'chord-only-line') {
        const chordLineDiv = document.createElement('div');
        chordLineDiv.className = 'song-line chord-only-line';

        // Procesar tokens de acordes y espacios
        const regex = /(\S+)|\s+/g;
        let match;
        while ((match = regex.exec(item.text)) !== null) {
          if (match[1]) {
            const token = match[1];
            if (ChordTransposer.isValidChord(token)) {
              const transposed = ChordTransposer.transposeChord(token, state.semitones, options);
              const badge = document.createElement('span');
              badge.className = 'chord-badge';
              badge.textContent = transposed;
              badge.setAttribute('data-original-chord', token);
              badge.title = `Acorde: ${transposed} (Original: ${token})`;
              chordLineDiv.appendChild(badge);
            } else {
              const textSpan = document.createElement('span');
              textSpan.className = 'lyric-text';
              textSpan.textContent = token;
              chordLineDiv.appendChild(textSpan);
            }
          } else {
            const spaceSpan = document.createElement('span');
            spaceSpan.style.whiteSpace = 'pre';
            spaceSpan.textContent = match[0];
            chordLineDiv.appendChild(spaceSpan);
          }
        }
        elements.sheetBody.appendChild(chordLineDiv);
        return;
      }

      // Línea de letra con acordes alineados
      if (item.type === 'lyric-line') {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'song-line';

        // Si es una línea totalmente vacía, darle altura y espacio de salto de línea
        const isBlank = item.segments.every(s => !s.chord && (!s.lyric || s.lyric.trim().length === 0));
        if (isBlank) {
          lineDiv.className = 'song-line song-line-empty';
          lineDiv.innerHTML = '&nbsp;';
          elements.sheetBody.appendChild(lineDiv);
          return;
        }

        item.segments.forEach(seg => {
          const pairDiv = document.createElement('div');
          pairDiv.className = 'chord-lyric-pair';

          // Elemento para el acorde (arriba)
          const chordSpan = document.createElement('span');
          if (seg.chord) {
            chordSpan.className = 'chord-badge';
            const transposed = ChordTransposer.transposeChord(seg.chord, state.semitones, options);
            chordSpan.textContent = transposed;
            chordSpan.setAttribute('data-original-chord', seg.chord);
            chordSpan.title = `Acorde: ${transposed} (Original: ${seg.chord})`;
          } else {
            chordSpan.className = 'chord-badge empty-chord';
            chordSpan.textContent = '';
          }

          // Elemento para la letra (abajo)
          const lyricSpan = document.createElement('span');
          lyricSpan.className = 'lyric-text';
          lyricSpan.textContent = seg.lyric || (seg.chord ? '\u00A0' : '');

          pairDiv.appendChild(chordSpan);
          pairDiv.appendChild(lyricSpan);
          lineDiv.appendChild(pairDiv);
        });

        elements.sheetBody.appendChild(lineDiv);
      }
    });
  }

  /**
   * Actualiza la barra de acordes rápidos según la tonalidad
   */
  function updateQuickChords(key) {
    elements.quickChordContainer.innerHTML = '';
    if (!key) return;

    const isMinor = key.endsWith('m');
    const root = key.replace(/m$/, '');
    const scaleChords = ChordTransposer.getScaleChords(root, isMinor);

    scaleChords.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'btn-palette-chord';
      btn.textContent = c.chord;
      btn.title = `Grado armónico ${c.degree}: insertar [${c.chord}] en el cursor`;
      btn.addEventListener('click', () => {
        insertChordAtCursor(`[${c.chord}]`);
      });
      elements.quickChordContainer.appendChild(btn);
    });
  }

  /**
   * Inserta un texto en la posición actual del cursor dentro del editor
   */
  function insertChordAtCursor(chordText) {
    const textarea = elements.songInput;
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const text = textarea.value;

    textarea.value = text.substring(0, startPos) + chordText + text.substring(endPos, text.length);
    textarea.focus();
    textarea.selectionStart = startPos + chordText.length;
    textarea.selectionEnd = startPos + chordText.length;

    localStorage.setItem('lyrchords_current_song', textarea.value);
    render();
  }

  /**
   * Abre el modal para crear e insertar un acorde
   */
  function openChordModal() {
    elements.chordModal.classList.add('open');
    updateModalPreview();
  }

  /**
   * Cierra el modal de inserción
   */
  function closeChordModal() {
    elements.chordModal.classList.remove('open');
  }

  /**
   * Actualiza la vista previa del acorde en el modal
   */
  function updateModalPreview() {
    const root = elements.modalRootNote.value;
    const quality = elements.modalChordQuality.value;
    const bass = elements.modalBassNote.value;
    
    // Traducir si la preferencia es latina
    let displayChord = root + quality + bass;
    if (state.notation === 'latin') {
      displayChord = ChordTransposer.convertChordNotation(displayChord, 'latin');
    }

    elements.modalChordPreview.textContent = `[${displayChord}]`;
  }

  /**
   * Confirma la inserción del acorde desde el modal
   */
  function confirmInsertChord() {
    const chord = elements.modalChordPreview.textContent.trim();
    insertChordAtCursor(chord);
    closeChordModal();
  }

  /**
   * Genera y descarga el PDF de la partitura renderizada (con notas y letra)
   */
  async function downloadSheetAsPdf() {
    const rawText = elements.songInput.value;
    const meta = extractMetadata(rawText);
    const cleanTitle = (meta.title || 'Cancion').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'Cancion';
    const effectiveKey = state.currentKey || state.originalKey || 'C';
    const filename = `${cleanTitle} - [Tono ${effectiveKey}].pdf`;

    const btn = elements.btnExportPdf;
    const originalContent = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Generando PDF...</span>';
    }

    try {
      if (typeof html2pdf === 'undefined') {
        window.print();
        if (btn) {
          btn.innerHTML = originalContent;
          btn.disabled = false;
        }
        return;
      }

      const element = elements.songSheet;
      
      const opt = {
        margin: [12, 14, 12, 14], // mm (top, left, bottom, right)
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          letterRendering: true,
          scrollY: 0,
          backgroundColor: '#ffffff'
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(element).save();
      
      if (btn) {
        btn.innerHTML = '<span>✔ ¡PDF Descargado!</span>';
        setTimeout(() => {
          btn.innerHTML = originalContent;
          btn.disabled = false;
        }, 2000);
      }
    } catch (err) {
      console.error('Error generando PDF:', err);
      alert('Hubo un inconveniente al generar el PDF directamente. Se abrirá el cuadro de impresión para guardarlo como PDF.');
      window.print();
      if (btn) {
        btn.innerHTML = originalContent;
        btn.disabled = false;
      }
    }
  }

  /**
   * Exporta la canción a archivo .txt o .pro
   */
  function exportSongText() {
    const text = elements.songInput.value;
    const meta = extractMetadata(text);
    const filename = `${meta.title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'cancion'}.txt`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Inicializar al cargar el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
