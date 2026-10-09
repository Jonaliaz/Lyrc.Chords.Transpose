/**
 * LyrChords Transposer - Gestor de Proyectos
 * Maneja el almacenamiento local, exportación, importación y gestión de proyectos/canciones guardadas.
 */

const ProjectsManager = (function () {
  'use strict';

  const STORAGE_KEY = 'lyrchords_projects';
  const SETTINGS_KEY = 'lyrchords_settings';
  const CURRENT_PROJ_KEY = 'lyrchords_current_project_id';

  /**
   * Obtiene la lista completa de proyectos guardados con compatibilidad de índices y claves legacy
   * @returns {Array<Object>}
   */
  function getAll() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      let list = [];
      if (data) {
        const parsed = JSON.parse(data);
        list = Array.isArray(parsed) ? parsed : [];
      }

      // Recuperación y migración de claves de almacenamiento legacy o alternativas
      if (list.length === 0) {
        const legacyKeys = ['chords_projects', 'lyrchords_saved_songs', 'songs_library', 'lyrchords_songs', 'song_projects'];
        for (const k of legacyKeys) {
          const legData = localStorage.getItem(k);
          if (legData) {
            try {
              const legParsed = JSON.parse(legData);
              if (Array.isArray(legParsed) && legParsed.length > 0) {
                list = legParsed;
                saveAll(list);
                break;
              }
            } catch (e) {}
          }
        }
      }

      // Garantizar que todos los proyectos tengan un ID válido y estructura compatible
      let modified = false;
      list.forEach((p, idx) => {
        if (!p || typeof p !== 'object') return;
        if (!p.id && p.id !== 0) {
          p.id = 'proj_' + (Date.now() + idx) + '_' + Math.random().toString(36).substring(2, 7);
          modified = true;
        } else {
          p.id = String(p.id);
        }
      });

      if (modified) {
        saveAll(list);
      }

      return list;
    } catch (e) {
      console.error('Error al leer proyectos de localStorage:', e);
      return [];
    }
  }

  /**
   * Guarda todos los proyectos en localStorage
   * @param {Array<Object>} list 
   */
  function saveAll(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Error al guardar proyectos en localStorage:', e);
    }
  }

  /**
   * Obtiene un proyecto por su ID o por su índice numérico
   * @param {string|number} id 
   * @returns {Object|null}
   */
  function getById(id) {
    if (id === null || id === undefined || id === '') return null;
    const list = getAll();
    const strId = String(id);
    return list.find((p, index) => p.id === strId || String(index) === strId || (p.id === id)) || null;
  }

  /**
   * Guarda o actualiza un proyecto con compatibilidad de ID e índice
   * @param {Object} projectData 
   * @returns {Object} el proyecto guardado
   */
  function save(projectData) {
    if (!projectData) return null;
    const list = getAll();
    const now = new Date().toISOString();

    let project = null;
    if (projectData.id !== undefined && projectData.id !== null && projectData.id !== '') {
      const strId = String(projectData.id);
      const index = list.findIndex((p, idx) => p.id === strId || String(idx) === strId || p.id === projectData.id);
      if (index !== -1) {
        project = {
          ...list[index],
          ...projectData,
          id: list[index].id, // Preservar ID existente
          updatedAt: now
        };
        list[index] = project;
      }
    }

    if (!project) {
      const newId = projectData.id ? String(projectData.id) : ('proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
      project = {
        id: newId,
        title: projectData.title || 'Mi Canción',
        artist: projectData.artist || '',
        key: projectData.key || 'C',
        capo: projectData.capo || 0,
        semitones: projectData.semitones || 0,
        content: projectData.content || '',
        createdAt: now,
        updatedAt: now
      };
      list.unshift(project); // Poner al inicio
    }

    saveAll(list);
    setCurrentProjectId(project.id);
    return project;
  }

  /**
   * Elimina un proyecto por ID o índice
   * @param {string|number} id 
   * @returns {boolean}
   */
  function deleteProject(id) {
    if (id === null || id === undefined) return false;
    let list = getAll();
    const prevLen = list.length;
    const strId = String(id);
    list = list.filter((p, idx) => p.id !== strId && String(idx) !== strId && p.id !== id);
    if (list.length !== prevLen) {
      saveAll(list);
      const cur = getCurrentProjectId();
      if (cur === strId || cur === id) {
        setCurrentProjectId(null);
      }
      return true;
    }
    return false;
  }

  /**
   * Duplica un proyecto existente
   * @param {string|number} id 
   * @returns {Object|null}
   */
  function duplicate(id) {
    const original = getById(id);
    if (!original) return null;

    const copy = {
      ...original,
      id: null,
      title: `${original.title} (Copia)`,
      content: original.content ? original.content.replace(/^\{title:\s*(.*?)\s*\}/m, `{title: ${original.title} (Copia)}`) : ''
    };

    return save(copy);
  }

  /**
   * Obtiene el ID del proyecto actualmente activo
   * @returns {string|null}
   */
  function getCurrentProjectId() {
    return localStorage.getItem(CURRENT_PROJ_KEY) || null;
  }

  /**
   * Establece el ID del proyecto actualmente activo
   * @param {string|null} id 
   */
  function setCurrentProjectId(id) {
    if (id) {
      localStorage.setItem(CURRENT_PROJ_KEY, id);
    } else {
      localStorage.removeItem(CURRENT_PROJ_KEY);
    }
  }

  /**
   * Lee la configuración del usuario
   * @returns {Object}
   */
  function getSettings() {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      const defaults = {
        showStartupModal: true,
        autoSaveInterval: 0 // 0 = deshabilitado o continuo
      };
      if (!data) return defaults;
      return { ...defaults, ...JSON.parse(data) };
    } catch (e) {
      return { showStartupModal: true };
    }
  }

  /**
   * Guarda la configuración del usuario
   * @param {Object} newSettings 
   */
  function saveSettings(newSettings) {
    try {
      const current = getSettings();
      const updated = { ...current, ...newSettings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Error al guardar configuración:', e);
      return getSettings();
    }
  }

  /**
   * Descarga un archivo en el navegador
   * @param {string} content 
   * @param {string} filename 
   * @param {string} type 
   */
  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Exporta un proyecto como archivo de texto (.pro o .txt)
   * @param {Object} project 
   */
  function exportProjectAsFile(project) {
    const safeTitle = (project.title || 'cancion').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'cancion';
    downloadFile(project.content, `${safeTitle}.pro`, 'text/plain;charset=utf-8');
  }

  /**
   * Exporta todos los proyectos a un archivo JSON de respaldo
   */
  function exportAllProjectsJson() {
    const list = getAll();
    const data = {
      app: 'LyrChords Transposer',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      projectsCount: list.length,
      projects: list
    };
    const jsonStr = JSON.stringify(data, null, 2);
    downloadFile(jsonStr, `lyrchords_respaldo_proyectos_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  }

  /**
   * Importa proyectos desde una cadena JSON
   * @param {string} jsonString 
   * @returns {{ imported: number, total: number }}
   */
  function importFromJson(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      let incomingProjects = [];
      if (Array.isArray(data)) {
        incomingProjects = data;
      } else if (data && Array.isArray(data.projects)) {
        incomingProjects = data.projects;
      } else if (data && data.title && data.content) {
        incomingProjects = [data];
      }

      if (!incomingProjects.length) {
        throw new Error('No se encontraron proyectos válidos en el archivo JSON.');
      }

      const currentList = getAll();
      let count = 0;

      incomingProjects.forEach(inc => {
        if (!inc.title || !inc.content) return;
        const exists = currentList.find(p => p.id === inc.id);
        if (exists) {
          // Actualizar si es más nuevo o duplicar con nuevo ID
          inc.id = 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        } else if (!inc.id) {
          inc.id = 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        }
        currentList.unshift(inc);
        count++;
      });

      saveAll(currentList);
      return { imported: count, total: currentList.length };
    } catch (e) {
      throw new Error('Formato de archivo inválido: ' + e.message);
    }
  }

  return {
    getAll,
    getById,
    save,
    deleteProject,
    duplicate,
    getCurrentProjectId,
    setCurrentProjectId,
    getSettings,
    saveSettings,
    exportProjectAsFile,
    exportAllProjectsJson,
    importFromJson
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProjectsManager;
}
