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
    activeProjectBadge: document.getElementById('activeProjectBadge'),
    unsavedChangesBadge: document.getElementById('unsavedChangesBadge'),

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

    // Acciones Generales & Proyectos
    projectSelector: document.getElementById('projectSelector'),
    groupUserProjects: document.getElementById('groupUserProjects'),
    groupExamples: document.getElementById('groupExamples'),
    btnOpenProjects: document.getElementById('btnOpenProjects'),
    btnSaveProject: document.getElementById('btnSaveProject'),
    btnSaveAsProject: document.getElementById('btnSaveAsProject'),
    btnNewSong: document.getElementById('btnNewSong'),
    btnExportPdf: document.getElementById('btnExportPdf'),
    btnPrint: document.getElementById('btnPrint'),
    btnToggleTheme: document.getElementById('btnToggleTheme'),

    // Modal de Acordes
    chordModal: document.getElementById('chordModal'),
    btnCloseModal: document.getElementById('btnCloseModal'),
    btnCancelModal: document.getElementById('btnCancelModal'),
    btnConfirmInsertChord: document.getElementById('btnConfirmInsertChord'),
    modalRootNote: document.getElementById('modalRootNote'),
    modalChordQuality: document.getElementById('modalChordQuality'),
    modalBassNote: document.getElementById('modalBassNote'),
    modalChordPreview: document.getElementById('modalChordPreview'),

    // Modal Gestor de Proyectos
    projectsModal: document.getElementById('projectsModal'),
    btnCloseProjectsModal: document.getElementById('btnCloseProjectsModal'),
    btnModalCloseOnly: document.getElementById('btnModalCloseOnly'),
    btnModalNewSong: document.getElementById('btnModalNewSong'),
    btnEmptyNewProject: document.getElementById('btnEmptyNewProject'),
    projectSearchInput: document.getElementById('projectSearchInput'),
    userProjectsList: document.getElementById('userProjectsList'),
    examplesList: document.getElementById('examplesList'),
    emptyProjectsView: document.getElementById('emptyProjectsView'),
    userProjectsCountBadge: document.getElementById('userProjectsCountBadge'),
    btnExportAllBackup: document.getElementById('btnExportAllBackup'),
    btnTriggerImportFile: document.getElementById('btnTriggerImportFile'),
    importFileInput: document.getElementById('importFileInput'),
    chkStartupModal: document.getElementById('chkStartupModal'),

    // Modal Guardar Proyecto
    saveProjectModal: document.getElementById('saveProjectModal'),
    saveProjectModalTitle: document.getElementById('saveProjectModalTitle'),
    saveProjectForm: document.getElementById('saveProjectForm'),
    btnCloseSaveModal: document.getElementById('btnCloseSaveModal'),
    btnCancelSaveModal: document.getElementById('btnCancelSaveModal'),
    saveProjTitle: document.getElementById('saveProjTitle'),
    saveProjArtist: document.getElementById('saveProjArtist'),
    saveProjKey: document.getElementById('saveProjKey'),
    saveProjCapo: document.getElementById('saveProjCapo'),

    // Modal Confirmación de Cambios Sin Guardar
    confirmUnsavedModal: document.getElementById('confirmUnsavedModal'),
    btnCloseUnsavedModal: document.getElementById('btnCloseUnsavedModal'),
    btnCancelUnsavedAction: document.getElementById('btnCancelUnsavedAction'),
    btnDiscardUnsavedAction: document.getElementById('btnDiscardUnsavedAction'),
    btnSaveUnsavedAction: document.getElementById('btnSaveUnsavedAction'),
    unsavedProjectTitle: document.getElementById('unsavedProjectTitle'),

    // Toast
    toastNotification: document.getElementById('toastNotification')
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
    originalKey: 'C',

    // Estado de Proyectos
    currentProjectId: null,
    cleanSnapshot: '', // Contenido de referencia para detectar si hay cambios sin guardar
    saveModalMode: 'save', // 'save' | 'saveAs'
    pendingAction: null // Acción a ejecutar tras guardar o descartar
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
   * Muestra un mensaje toast flotante en pantalla
   */
  let toastTimeout = null;
  function showToast(message, type = 'success', duration = 3000) {
    if (!elements.toastNotification) return;
    clearTimeout(toastTimeout);
    elements.toastNotification.textContent = message;
    elements.toastNotification.className = `toast-notification show ${type}`;
    toastTimeout = setTimeout(() => {
      elements.toastNotification.className = 'toast-notification';
    }, duration);
  }

  /**
   * Comprueba si el contenido actual tiene cambios sin guardar respecto a la última versión limpia
   */
  function isDirty() {
    const currentText = elements.songInput.value;
    return currentText !== state.cleanSnapshot;
  }

  /**
   * Actualiza los indicadores visuales de estado del proyecto (nombre y cambios sin guardar)
   */
  function updateProjectStatusUI() {
    const dirty = isDirty();
    if (elements.unsavedChangesBadge) {
      elements.unsavedChangesBadge.style.display = dirty ? 'inline-flex' : 'none';
    }

    if (elements.activeProjectBadge) {
      if (state.currentProjectId) {
        const proj = ProjectsManager.getById(state.currentProjectId);
        if (proj) {
          elements.activeProjectBadge.textContent = `📁 ${proj.title}`;
          elements.activeProjectBadge.title = `Proyecto guardado: ${proj.title} (ID: ${proj.id})`;
        } else {
          elements.activeProjectBadge.textContent = '📄 Sin Guardar';
          elements.activeProjectBadge.title = 'Canción no guardada como proyecto';
        }
      } else {
        elements.activeProjectBadge.textContent = '📄 Sin Guardar';
        elements.activeProjectBadge.title = 'Canción no guardada como proyecto';
      }
    }
  }

  /**
   * Inicialización del programa
   */
  function init() {
    populateKeySelector();
    populateSaveModalKeySelector();
    populateProjectSelector();
    bindEvents();
    bindProjectEvents();

    // Cargar opciones guardadas
    const settings = ProjectsManager.getSettings();
    if (elements.chkStartupModal) {
      elements.chkStartupModal.checked = settings.showStartupModal !== false;
    }

    // Comprobar si había un proyecto activo previamente
    const lastProjId = ProjectsManager.getCurrentProjectId();
    let loaded = false;
    if (lastProjId) {
      const proj = ProjectsManager.getById(lastProjId);
      if (proj) {
        loadProject(proj.id, true);
        loaded = true;
      }
    }

    if (!loaded) {
      const savedSong = localStorage.getItem('lyrchords_current_song');
      if (savedSong && savedSong.trim().length > 0) {
        elements.songInput.value = savedSong;
        state.cleanSnapshot = savedSong;
        state.currentProjectId = null;
        render();
      } else {
        loadExample('musica-ligera', true);
      }
    }

    // Si está habilitado mostrar el gestor al abrir la app, abrirlo
    if (settings.showStartupModal !== false) {
      setTimeout(() => {
        openProjectsModal('tab-user-projects');
      }, 150);
    }
  }

  /**
   * Llena las opciones del selector de tonalidad principal
   */
  function populateKeySelector() {
    elements.targetKeySelect.innerHTML = '';
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
   * Llena las opciones del selector de tonalidad en el modal de guardado
   */
  function populateSaveModalKeySelector() {
    if (!elements.saveProjKey) return;
    elements.saveProjKey.innerHTML = '';
    ALL_KEYS.forEach(k => {
      const option = document.createElement('option');
      option.value = k.eng;
      option.textContent = `${k.eng} (${k.lat})`;
      elements.saveProjKey.appendChild(option);
    });
  }

  /**
   * Llena las opciones del selector dropdown en el header (proyectos y ejemplos)
   */
  function populateProjectSelector() {
    if (!elements.projectSelector || !elements.groupUserProjects || !elements.groupExamples) return;

    // 1. Proyectos de usuario
    elements.groupUserProjects.innerHTML = '';
    const projects = ProjectsManager.getAll();
    if (projects.length === 0) {
      const opt = document.createElement('option');
      opt.disabled = true;
      opt.textContent = '(Sin proyectos guardados aún)';
      elements.groupUserProjects.appendChild(opt);
    } else {
      projects.forEach(p => {
        const opt = document.createElement('option');
        opt.value = `project:${p.id}`;
        opt.textContent = p.artist ? `${p.title} - ${p.artist}` : p.title;
        if (state.currentProjectId === p.id) {
          opt.selected = true;
        }
        elements.groupUserProjects.appendChild(opt);
      });
    }

    // 2. Ejemplos
    elements.groupExamples.innerHTML = '';
    if (typeof SONG_EXAMPLES !== 'undefined') {
      SONG_EXAMPLES.forEach(ex => {
        const opt = document.createElement('option');
        opt.value = `example:${ex.id}`;
        opt.textContent = ex.artist ? `${ex.artist} - ${ex.title}` : ex.title;
        elements.groupExamples.appendChild(opt);
      });
    }

    if (elements.userProjectsCountBadge) {
      elements.userProjectsCountBadge.textContent = projects.length;
    }
  }

  /**
   * Enlaza todos los escuchadores de eventos principales
   */
  function bindEvents() {
    // Entrada de texto en el editor
    elements.songInput.addEventListener('input', () => {
      localStorage.setItem('lyrchords_current_song', elements.songInput.value);
      updateSongStats();
      updateProjectStatusUI();
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
      updateProjectStatusUI();
      showToast('¡Listo! Acordes alineados sobre la letra');
    });

    // Zoom de fuente
    elements.btnFontInc.addEventListener('click', () => adjustFontSize(1));
    elements.btnFontDec.addEventListener('click', () => adjustFontSize(-1));

    // Auto-Scroll
    elements.btnAutoScroll.addEventListener('click', toggleAutoScroll);

    // Pantalla completa / Modo escenario
    elements.btnToggleFullscreen.addEventListener('click', toggleFullscreen);

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

    // Botones de transposición rápida en el visor
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
   * Enlaza eventos de gestión de proyectos, atajos de teclado y confirmación al salir
   */
  function bindProjectEvents() {
    // Selector principal de proyectos / ejemplos
    elements.projectSelector.addEventListener('change', (e) => {
      const val = e.target.value;
      if (!val) return;

      if (val === '__open_manager__') {
        openProjectsModal('tab-user-projects');
        e.target.value = '';
        return;
      }

      if (val === 'plantilla-vacia') {
        createNewSongWithCheck();
        e.target.value = '';
        return;
      }

      if (val.startsWith('project:')) {
        const id = val.replace('project:', '');
        promptIfDirty(() => loadProject(id));
      } else if (val.startsWith('example:')) {
        const id = val.replace('example:', '');
        promptIfDirty(() => loadExample(id));
      }

      e.target.value = '';
    });

    // Botones de la barra superior
    elements.btnOpenProjects.addEventListener('click', () => openProjectsModal('tab-user-projects'));
    elements.btnSaveProject.addEventListener('click', () => quickSaveProject());
    elements.btnSaveAsProject.addEventListener('click', () => openSaveModal('saveAs'));
    elements.btnNewSong.addEventListener('click', () => createNewSongWithCheck());

    // Botones del Modal de Proyectos
    elements.btnCloseProjectsModal.addEventListener('click', closeProjectsModal);
    elements.btnModalCloseOnly.addEventListener('click', closeProjectsModal);
    elements.btnModalNewSong.addEventListener('click', () => {
      closeProjectsModal();
      createNewSongWithCheck();
    });
    if (elements.btnEmptyNewProject) {
      elements.btnEmptyNewProject.addEventListener('click', () => {
        closeProjectsModal();
        createNewSongWithCheck();
      });
    }

    // Buscador en el modal de proyectos
    elements.projectSearchInput.addEventListener('input', (e) => {
      renderProjectsList(e.target.value);
    });

    // Pestañas del modal de proyectos
    const tabButtons = elements.projectsModal.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        tabButtons.forEach(b => b.classList.remove('active'));
        elements.projectsModal.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        btn.classList.add('active');
        const content = document.getElementById(targetTab);
        if (content) content.classList.add('active');
      });
    });

    // Checkbox de inicio
    if (elements.chkStartupModal) {
      elements.chkStartupModal.addEventListener('change', (e) => {
        ProjectsManager.saveSettings({ showStartupModal: e.target.checked });
        showToast(e.target.checked ? '✓ Gestor activado al iniciar' : '✓ Gestor desactivado al iniciar', 'info');
      });
    }

    // Respaldo e Importación
    if (elements.btnExportAllBackup) {
      elements.btnExportAllBackup.addEventListener('click', () => {
        ProjectsManager.exportAllProjectsJson();
        showToast('✓ Respaldo de canciones exportado');
      });
    }

    if (elements.btnTriggerImportFile && elements.importFileInput) {
      elements.btnTriggerImportFile.addEventListener('click', () => {
        elements.importFileInput.click();
      });

      elements.importFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const content = evt.target.result;
            if (file.name.endsWith('.json')) {
              const res = ProjectsManager.importFromJson(content);
              showToast(`✓ Se importaron ${res.imported} proyectos exitosamente`);
            } else {
              // Archivo de texto/chordpro individual
              const meta = extractMetadata(content);
              const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
              const newProj = ProjectsManager.save({
                title: meta.title !== 'Canción Sin Título' ? meta.title : nameWithoutExt,
                artist: meta.artist || '',
                key: meta.key || 'C',
                capo: 0,
                semitones: 0,
                content: content
              });
              showToast(`✓ Canción "${newProj.title}" importada`);
            }
            populateProjectSelector();
            renderProjectsList();
          } catch (err) {
            console.error('Error importando:', err);
            alert('Error al importar el archivo: ' + err.message);
          }
        };
        reader.readAsText(file, 'utf-8');
        elements.importFileInput.value = '';
      });
    }

    // Modal de Guardar
    elements.btnCloseSaveModal.addEventListener('click', closeSaveModal);
    elements.btnCancelSaveModal.addEventListener('click', closeSaveModal);
    elements.saveProjectForm.addEventListener('submit', (e) => {
      e.preventDefault();
      confirmSaveProjectFromModal();
    });

    // Modal de Confirmación de Cambios Sin Guardar
    elements.btnCloseUnsavedModal.addEventListener('click', closeConfirmUnsavedModal);
    elements.btnCancelUnsavedAction.addEventListener('click', closeConfirmUnsavedModal);
    
    elements.btnDiscardUnsavedAction.addEventListener('click', () => {
      closeConfirmUnsavedModal();
      if (typeof state.pendingAction === 'function') {
        const act = state.pendingAction;
        state.pendingAction = null;
        act();
      }
    });

    elements.btnSaveUnsavedAction.addEventListener('click', () => {
      closeConfirmUnsavedModal();
      quickSaveProject(() => {
        if (typeof state.pendingAction === 'function') {
          const act = state.pendingAction;
          state.pendingAction = null;
          act();
        }
      });
    });

    // Atajos de Teclado
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        quickSaveProject();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        openProjectsModal('tab-user-projects');
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createNewSongWithCheck();
      }
    });

    // Control al cerrar la aplicación (Web y Tauri)
    window.addEventListener('beforeunload', (e) => {
      if (isDirty()) {
        e.preventDefault();
        e.returnValue = 'Tienes cambios sin guardar en tu canción. ¿Deseas salir?';
        return e.returnValue;
      }
    });
  }

  /**
   * Ejecuta una acción comprobando primero si hay cambios sin guardar
   */
  function promptIfDirty(onProceed) {
    if (!isDirty()) {
      onProceed();
      return;
    }

    state.pendingAction = onProceed;
    const meta = extractMetadata(elements.songInput.value);
    let title = meta.title || 'Canción Sin Título';
    if (state.currentProjectId) {
      const p = ProjectsManager.getById(state.currentProjectId);
      if (p) title = p.title;
    }

    if (elements.unsavedProjectTitle) {
      elements.unsavedProjectTitle.textContent = `"${title}"`;
    }

    elements.confirmUnsavedModal.classList.add('open');
  }

  /**
   * Cierra el modal de cambios sin guardar
   */
  function closeConfirmUnsavedModal() {
    elements.confirmUnsavedModal.classList.remove('open');
  }

  /**
   * Acción para crear nueva canción pidiendo confirmación si está modificada
   */
  function createNewSongWithCheck() {
    promptIfDirty(() => {
      loadExample('plantilla-vacia');
      state.currentProjectId = null;
      ProjectsManager.setCurrentProjectId(null);
      updateProjectStatusUI();
      showToast('✨ Nueva canción en blanco lista para editar');
    });
  }

  /**
   * Guardado rápido del proyecto actual o apertura del diálogo si es nuevo
   */
  function quickSaveProject(onSuccess) {
    if (state.currentProjectId) {
      // Proyecto existente -> actualizar directamente
      const currentText = elements.songInput.value;
      const meta = extractMetadata(currentText);
      const existing = ProjectsManager.getById(state.currentProjectId);

      const saved = ProjectsManager.save({
        id: state.currentProjectId,
        title: meta.title !== 'Canción Sin Título' ? meta.title : (existing ? existing.title : 'Mi Canción'),
        artist: meta.artist || (existing ? existing.artist : ''),
        key: state.originalKey,
        capo: state.capo,
        semitones: state.semitones,
        content: currentText
      });

      state.cleanSnapshot = currentText;
      updateProjectStatusUI();
      populateProjectSelector();
      showToast(`💾 Proyecto "${saved.title}" guardado correctamente`);
      if (typeof onSuccess === 'function') onSuccess(saved);
    } else {
      // Canción nueva -> abrir modal para pedir título
      openSaveModal('save', onSuccess);
    }
  }

  /**
   * Abre el modal para guardar o guardar como
   */
  function openSaveModal(mode = 'save', onSuccess) {
    state.saveModalMode = mode;
    state.pendingSaveSuccess = onSuccess;

    const rawText = elements.songInput.value;
    const meta = extractMetadata(rawText);

    let defaultTitle = meta.title || '';
    let defaultArtist = meta.artist || '';
    let defaultKey = state.originalKey || meta.key || 'C';
    let defaultCapo = state.capo || 0;

    if (mode === 'saveAs' && state.currentProjectId) {
      const proj = ProjectsManager.getById(state.currentProjectId);
      if (proj) {
        defaultTitle = `${proj.title} (Copia)`;
        defaultArtist = proj.artist;
        defaultKey = proj.key;
        defaultCapo = proj.capo;
      }
    }

    elements.saveProjTitle.value = defaultTitle !== 'Canción Sin Título' ? defaultTitle : '';
    elements.saveProjArtist.value = defaultArtist;
    elements.saveProjKey.value = defaultKey;
    elements.saveProjCapo.value = defaultCapo.toString();

    elements.saveProjectModalTitle.textContent = mode === 'saveAs' ? '💾 Guardar Como Nuevo Proyecto' : '💾 Guardar Proyecto';
    elements.saveProjectModal.classList.add('open');
    elements.saveProjTitle.focus();
  }

  /**
   * Cierra el modal de guardar
   */
  function closeSaveModal() {
    elements.saveProjectModal.classList.remove('open');
  }

  /**
   * Procesa el guardado desde el formulario del modal
   */
  function confirmSaveProjectFromModal() {
    const title = elements.saveProjTitle.value.trim() || 'Mi Canción';
    const artist = elements.saveProjArtist.value.trim();
    const key = elements.saveProjKey.value;
    const capo = parseInt(elements.saveProjCapo.value, 10) || 0;

    let content = elements.songInput.value;

    // Sincronizar directivas {title: ...}, {artist: ...}, {key: ...} en el texto
    if (/^\{title:\s*.*?\}/m.test(content)) {
      content = content.replace(/^\{title:\s*.*?\}/m, `{title: ${title}}`);
    } else {
      content = `{title: ${title}}\n` + content;
    }

    if (/^\{artist:\s*.*?\}/m.test(content)) {
      content = content.replace(/^\{artist:\s*.*?\}/m, `{artist: ${artist}}`);
    } else if (artist) {
      content = content.replace(/(\{title:\s*.*?\})/, `$1\n{artist: ${artist}}`);
    }

    if (/^\{key:\s*.*?\}/m.test(content)) {
      content = content.replace(/^\{key:\s*.*?\}/m, `{key: ${key}}`);
    } else if (key) {
      content = content.replace(/(\{title:\s*.*?\})/, `$1\n{key: ${key}}`);
    }

    elements.songInput.value = content;
    state.originalKey = key;
    state.capo = capo;
    elements.capoSelect.value = capo.toString();
    updateCapoBadge();

    const projIdToUse = state.saveModalMode === 'saveAs' ? null : state.currentProjectId;

    const saved = ProjectsManager.save({
      id: projIdToUse,
      title,
      artist,
      key,
      capo,
      semitones: state.semitones,
      content
    });

    state.currentProjectId = saved.id;
    state.cleanSnapshot = content;

    closeSaveModal();
    updateProjectStatusUI();
    populateProjectSelector();
    render();

    showToast(`💾 Proyecto "${saved.title}" guardado exitosamente`);

    if (typeof state.pendingSaveSuccess === 'function') {
      const cb = state.pendingSaveSuccess;
      state.pendingSaveSuccess = null;
      cb(saved);
    }
  }

  /**
   * Abre el modal del Gestor de Proyectos
   */
  function openProjectsModal(defaultTab = 'tab-user-projects') {
    elements.projectsModal.classList.add('open');
    elements.projectSearchInput.value = '';

    // Activar pestaña solicitada
    const tabBtn = elements.projectsModal.querySelector(`.tab-btn[data-tab="${defaultTab}"]`);
    if (tabBtn) tabBtn.click();

    renderProjectsList();
    renderExamplesList();
  }

  /**
   * Cierra el modal del Gestor de Proyectos
   */
  function closeProjectsModal() {
    elements.projectsModal.classList.remove('open');
  }

  /**
   * Renderiza la lista de proyectos del usuario en el modal
   */
  function renderProjectsList(filterText = '') {
    const list = ProjectsManager.getAll();
    elements.userProjectsList.innerHTML = '';

    const cleanFilter = filterText.toLowerCase().trim();
    const filtered = list.filter(p => {
      if (!cleanFilter) return true;
      return (p.title && p.title.toLowerCase().includes(cleanFilter)) ||
             (p.artist && p.artist.toLowerCase().includes(cleanFilter)) ||
             (p.key && p.key.toLowerCase().includes(cleanFilter));
    });

    if (elements.userProjectsCountBadge) {
      elements.userProjectsCountBadge.textContent = list.length;
    }

    if (filtered.length === 0) {
      elements.emptyProjectsView.style.display = 'block';
      if (cleanFilter) {
        elements.emptyProjectsView.querySelector('h4').textContent = 'No se encontraron resultados';
        elements.emptyProjectsView.querySelector('p').textContent = `No hay proyectos que coincidan con "${filterText}".`;
      } else {
        elements.emptyProjectsView.querySelector('h4').textContent = 'Aún no has guardado canciones';
        elements.emptyProjectsView.querySelector('p').textContent = 'Guarda la canción que estás editando o crea un nuevo proyecto para tener tu repertorio disponible.';
      }
      return;
    }

    elements.emptyProjectsView.style.display = 'none';

    filtered.forEach(p => {
      const card = document.createElement('div');
      card.className = `project-card ${state.currentProjectId === p.id ? 'active-project' : ''}`;

      const dateStr = p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
      const snippet = (p.content || '').replace(/\{.*?\}/g, '').replace(/\[(.*?)\]/g, '$1 ').trim().substring(0, 95);

      card.innerHTML = `
        <div>
          <div class="project-card-header">
            <div>
              <div class="project-card-title">${escapeHtml(p.title)}</div>
              ${p.artist ? `<div class="project-card-artist">${escapeHtml(p.artist)}</div>` : ''}
            </div>
            <div class="project-card-meta">
              <span class="meta-chip key-chip" style="font-size:0.75rem;">${p.key || 'C'}</span>
              ${p.capo > 0 ? `<span class="meta-chip" style="font-size:0.72rem;">Capo ${p.capo}</span>` : ''}
            </div>
          </div>
          ${snippet ? `<div class="project-card-preview" style="margin-top:0.5rem;">${escapeHtml(snippet)}...</div>` : ''}
          ${dateStr ? `<div class="project-card-date" style="margin-top:0.4rem;">Modificado: ${dateStr}</div>` : ''}
        </div>
        <div class="project-card-actions">
          <button class="btn btn-sm btn-open-p" title="Abrir en el editor">📂 Abrir</button>
          <button class="btn btn-sm btn-export-p" title="Descargar archivo .pro">⬇️</button>
          <button class="btn btn-sm btn-dup-p" title="Duplicar">📋</button>
          <button class="btn btn-sm btn-danger btn-del-p" title="Eliminar proyecto">🗑️</button>
        </div>
      `;

      card.querySelector('.btn-open-p').addEventListener('click', () => {
        promptIfDirty(() => {
          loadProject(p.id);
          closeProjectsModal();
        });
      });

      card.querySelector('.btn-export-p').addEventListener('click', () => {
        ProjectsManager.exportProjectAsFile(p);
      });

      card.querySelector('.btn-dup-p').addEventListener('click', () => {
        const copy = ProjectsManager.duplicate(p.id);
        if (copy) {
          showToast(`✓ Copia creada: "${copy.title}"`);
          populateProjectSelector();
          renderProjectsList(elements.projectSearchInput.value);
        }
      });

      card.querySelector('.btn-del-p').addEventListener('click', () => {
        if (confirm(`¿Estás seguro de eliminar el proyecto "${p.title}"?`)) {
          ProjectsManager.deleteProject(p.id);
          if (state.currentProjectId === p.id) {
            state.currentProjectId = null;
            updateProjectStatusUI();
          }
          populateProjectSelector();
          renderProjectsList(elements.projectSearchInput.value);
          showToast('🗑️ Proyecto eliminado', 'warning');
        }
      });

      elements.userProjectsList.appendChild(card);
    });
  }

  /**
   * Renderiza la lista de ejemplos en el modal
   */
  function renderExamplesList() {
    if (!elements.examplesList || typeof SONG_EXAMPLES === 'undefined') return;
    elements.examplesList.innerHTML = '';

    SONG_EXAMPLES.forEach(ex => {
      const card = document.createElement('div');
      card.className = 'project-card';
      const snippet = (ex.content || '').replace(/\{.*?\}/g, '').replace(/\[(.*?)\]/g, '$1 ').trim().substring(0, 95);

      card.innerHTML = `
        <div>
          <div class="project-card-header">
            <div>
              <div class="project-card-title">${escapeHtml(ex.title)}</div>
              <div class="project-card-artist">${escapeHtml(ex.artist)}</div>
            </div>
            <span class="meta-chip key-chip" style="font-size:0.75rem;">${ex.key || 'C'}</span>
          </div>
          <div class="project-card-preview" style="margin-top:0.5rem;">${escapeHtml(snippet)}...</div>
        </div>
        <div class="project-card-actions">
          <button class="btn btn-sm btn-primary btn-load-ex">📂 Cargar Ejemplo</button>
        </div>
      `;

      card.querySelector('.btn-load-ex').addEventListener('click', () => {
        promptIfDirty(() => {
          loadExample(ex.id);
          closeProjectsModal();
        });
      });

      elements.examplesList.appendChild(card);
    });
  }

  /**
   * Carga un proyecto guardado por su ID
   */
  function loadProject(id, skipToast = false) {
    const p = ProjectsManager.getById(id);
    if (!p) return;

    state.currentProjectId = p.id;
    ProjectsManager.setCurrentProjectId(p.id);

    elements.songInput.value = p.content || '';
    state.cleanSnapshot = p.content || '';
    state.originalKey = p.key || 'C';
    state.semitones = p.semitones || 0;
    state.capo = p.capo || 0;

    elements.capoSelect.value = state.capo.toString();
    updateCapoBadge();
    updateTransposeUI();
    updateProjectStatusUI();
    populateProjectSelector();
    render();

    if (!skipToast) {
      showToast(`📂 Proyecto "${p.title}" abierto`);
    }
  }

  /**
   * Carga una canción de los ejemplos disponibles
   */
  function loadExample(exampleId, skipToast = false) {
    if (typeof SONG_EXAMPLES === 'undefined') return;
    const example = SONG_EXAMPLES.find(ex => ex.id === exampleId);
    if (!example) return;

    elements.songInput.value = example.content;
    state.cleanSnapshot = example.content;
    state.currentProjectId = null;
    ProjectsManager.setCurrentProjectId(null);

    state.originalKey = example.key || 'C';
    state.semitones = 0;
    state.capo = 0;
    elements.capoSelect.value = '0';
    updateCapoBadge();
    updateTransposeUI();
    updateProjectStatusUI();
    populateProjectSelector();
    render();

    if (!skipToast) {
      showToast(`🎵 Ejemplo "${example.title}" cargado`);
    }
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

    // Sincronizar controles en el visor
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
      const pixelsPerSecond = speedVal * 12 + 8;

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
   * Detecta metadatos y primera tonalidad de la canción
   */
  function extractMetadata(text) {
    let title = 'Canción Sin Título';
    let artist = '';
    let key = '';

    const lines = (text || '').split('\n');
    for (const line of lines) {
      const titleMatch = line.match(/^\{\s*title:\s*(.*?)\s*\}$/i);
      if (titleMatch) title = titleMatch[1];

      const artistMatch = line.match(/^\{\s*artist:\s*(.*?)\s*\}$/i);
      if (artistMatch) artist = artistMatch[1];

      const keyMatch = line.match(/^\{\s*key:\s*(.*?)\s*\}$/i);
      if (keyMatch) key = keyMatch[1];
    }

    if (!key) {
      const firstChordMatch = (text || '').match(/\[([A-G][b#]?[a-zA-Z0-9#b\+]*)\]/);
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

    elements.sheetSongTitle.textContent = meta.title;
    elements.sheetSongArtist.textContent = meta.artist;
    elements.sheetSongArtist.style.display = meta.artist ? 'block' : 'none';

    if (meta.key && meta.key !== state.originalKey) {
      state.originalKey = meta.key;
    }

    updateTransposeUI();
    updateQuickChords(state.currentKey || state.originalKey);

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
      if (item.type === 'directive') return;

      if (item.type === 'section') {
        const secDiv = document.createElement('div');
        secDiv.className = 'song-section-title';
        secDiv.textContent = item.text.replace(/\[|\]/g, '');
        elements.sheetBody.appendChild(secDiv);
        return;
      }

      if (item.type === 'chord-only-line') {
        const chordLineDiv = document.createElement('div');
        chordLineDiv.className = 'song-line chord-only-line';

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

      if (item.type === 'lyric-line') {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'song-line';

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
    updateProjectStatusUI();
    render();
  }

  /**
   * Abre el modal para construir e insertar un acorde
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
   * Genera y descarga el PDF de la partitura renderizada
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
        margin: [12, 14, 12, 14],
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

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function (m) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      })[m];
    });
  }

  // Inicializar al cargar el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
