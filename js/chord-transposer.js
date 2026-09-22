/**
 * ChordTransposer - Motor musical de detección y transposición de acordes
 * Soporta notación anglosajona (C, D, E...) y latina (Do, Re, Mi...)
 * Soporta alteraciones (#, b), acordes complejos y slash chords (ej: Am7/G, Do#m7/Fa#)
 */

(function (global) {
  'use strict';

  // Escalas cromáticas en semitonos (0 a 11)
  const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const NOTES_FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  const NOTES_LATIN_SHARP = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
  const NOTES_LATIN_FLAT  = ['Do', 'Reb', 'Re', 'Mib', 'Mi', 'Fa', 'Solb', 'Sol', 'Lab', 'La', 'Sib', 'Si'];

  // Diccionario de normalización a índice de semitono (0-11)
  const NOTE_TO_SEMITONE = {
    // Anglosajón
    'C': 0, 'B#': 0,
    'C#': 1, 'DB': 1,
    'D': 2,
    'D#': 3, 'EB': 3,
    'E': 4, 'FB': 4,
    'F': 5, 'E#': 5,
    'F#': 6, 'GB': 6,
    'G': 7,
    'G#': 8, 'AB': 8,
    'A': 9,
    'A#': 10, 'BB': 10,
    'B': 11, 'CB': 11,

    // Latino
    'DO': 0, 'SI#': 0,
    'DO#': 1, 'REB': 1,
    'RE': 2,
    'RE#': 3, 'MIB': 3,
    'MI': 4, 'FAB': 4,
    'FA': 5, 'MI#': 5,
    'FA#': 6, 'SOLB': 6,
    'SOL': 7,
    'SOL#': 8, 'LAB': 8,
    'LA': 9,
    'LA#': 10, 'SIB': 10,
    'SI': 11, 'DOB': 11
  };

  // Mapeo inverso de nota latina a anglosajona
  const LATIN_TO_ENGLISH = {
    'Do': 'C', 'Do#': 'C#', 'Reb': 'Db',
    'Re': 'D', 'Re#': 'D#', 'Mib': 'Eb',
    'Mi': 'E', 'Mi#': 'F',  'Fab': 'E',
    'Fa': 'F', 'Fa#': 'F#', 'Solb': 'Gb',
    'Sol': 'G', 'Sol#': 'G#', 'Lab': 'Ab',
    'La': 'A', 'La#': 'A#', 'Sib': 'Bb',
    'Si': 'B', 'Si#': 'C',  'Dob': 'B'
  };

  // Mapeo inverso de nota anglosajona a latina
  const ENGLISH_TO_LATIN = {
    'C': 'Do', 'C#': 'Do#', 'Db': 'Reb',
    'D': 'Re', 'D#': 'Re#', 'Eb': 'Mib',
    'E': 'Mi',
    'F': 'Fa', 'F#': 'Fa#', 'Gb': 'Solb',
    'G': 'Sol', 'G#': 'Sol#', 'Ab': 'Lab',
    'A': 'La', 'A#': 'La#', 'Bb': 'Sib',
    'B': 'Si'
  };

  // Expresión regular para detectar la nota raíz y el resto del acorde
  // Ordena por longitud para no confundir 'Sol' con 'So' o 'Do' con 'D'
  const ROOT_NOTES_REGEX_STR = '(?:Do#|Reb|Re#|Mib|Fa#|Solb|Sol#|Lab|La#|Sib|Do|Re|Mi|Fa|Sol|La|Si|C#|Db|D#|Eb|F#|Gb|G#|Ab|A#|Bb|B#|Cb|E#|Fb|C|D|E|F|G|A|B)';

  // Regex para un acorde completo:
  // Grupo 1: Nota raíz
  // Grupo 2: Modificadores/sufijos (m, maj7, sus4, dim, 7b5, etc.)
  // Grupo 3: Bajo alternativo opcional (/G, /F#, etc.)
  const CHORD_REGEX = new RegExp(
    `^(${ROOT_NOTES_REGEX_STR})([a-zA-Z0-9#b\\+°ºø∆\\(\\)\\-\\/]*?)(?:\\/(${ROOT_NOTES_REGEX_STR}))?$`,
    'i'
  );

  // Regex para encontrar acordes en un texto libre (palabras sueltas)
  const CHORD_TOKEN_REGEX = new RegExp(
    `\\b(${ROOT_NOTES_REGEX_STR})([a-zA-Z0-9#b\\+°ºø∆\\(\\)\\-]*)(?:\\/(${ROOT_NOTES_REGEX_STR}))?\\b`,
    'gi'
  );

  /**
   * Normaliza la capitalización de una nota musical
   */
  function normalizeNoteCase(note) {
    if (!note) return '';
    const upper = note.toUpperCase();
    // Identificar si es latina o anglosajona
    if (upper.startsWith('DO') || upper.startsWith('RE') || upper.startsWith('MI') ||
        upper.startsWith('FA') || upper.startsWith('SOL') || upper.startsWith('LA') || upper.startsWith('SI')) {
      let root = '';
      if (upper.startsWith('SOL')) root = 'Sol';
      else root = upper.charAt(0) + upper.charAt(1).toLowerCase();
      
      const rest = note.slice(root.length);
      return root + (rest.length > 0 ? (rest.charAt(0) === '#' ? '#' : 'b') : '');
    } else {
      const root = note.charAt(0).toUpperCase();
      const rest = note.slice(1);
      return root + (rest.length > 0 ? (rest.charAt(0) === '#' ? '#' : 'b') : '');
    }
  }

  /**
   * Determina si una nota está en notación latina
   */
  function isLatinNote(note) {
    if (!note) return false;
    const u = note.toUpperCase();
    return u.startsWith('DO') || u.startsWith('RE') || u.startsWith('MI') ||
           u.startsWith('FA') || u.startsWith('SOL') || u.startsWith('LA') || u.startsWith('SI');
  }

  /**
   * Obtiene el índice de semitono (0-11) de una nota
   */
  function getSemitone(note) {
    if (!note) return -1;
    const normalized = note.toUpperCase();
    return NOTE_TO_SEMITONE.hasOwnProperty(normalized) ? NOTE_TO_SEMITONE[normalized] : -1;
  }

  /**
   * Transpone una nota individual N semitonos
   * @param {string} note - Nota original (ej. 'C', 'F#', 'Sol', 'Mib')
   * @param {number} semitones - Número de semitonos a subir (+) o bajar (-)
   * @param {object} options - Opciones { preferSharps: boolean, targetNotation: 'auto'|'english'|'latin' }
   */
  function transposeNote(note, semitones, options = {}) {
    const currentSemitone = getSemitone(note);
    if (currentSemitone === -1) return note;

    const preferSharps = options.preferSharps !== undefined ? options.preferSharps : true;
    const targetNotation = options.targetNotation || (isLatinNote(note) ? 'latin' : 'english');

    let newSemitone = (currentSemitone + semitones) % 12;
    if (newSemitone < 0) newSemitone += 12;

    if (targetNotation === 'latin') {
      return preferSharps ? NOTES_LATIN_SHARP[newSemitone] : NOTES_LATIN_FLAT[newSemitone];
    } else {
      return preferSharps ? NOTES_SHARP[newSemitone] : NOTES_FLAT[newSemitone];
    }
  }

  /**
   * Valida si un string parece un acorde válido
   * @param {string} text - Texto del acorde
   * @param {boolean} isExplicit - Si está dentro de corchetes [C] o ingresado explícitamente
   */
  function isValidChord(text, isExplicit = false) {
    if (!text || typeof text !== 'string') return false;
    const trimmed = text.trim();
    if (trimmed.length === 0 || trimmed.length > 15) return false;

    // Si no es explícito (ej. escaneando palabras en texto plano), evitar palabras comunes del español
    if (!isExplicit) {
      const falsePositives = ['Y', 'O', 'E', 'DE', 'EL', 'EN', 'NO', 'SE', 'TE', 'AL', 'CON', 'POR', 'QUE', 'DEL'];
      if (falsePositives.includes(trimmed.toUpperCase())) {
        return false;
      }
    }

    const match = trimmed.match(CHORD_REGEX);
    return match !== null;
  }

  /**
   * Transpone un acorde completo (raíz + sufijo + bajo opcional)
   * @param {string} chord - Acorde original (ej: "Am7", "C#maj7", "G/B", "Re7/Fa#")
   * @param {number} semitones - Semitonos (+ sube, - baja)
   * @param {object} options - Opciones de formato
   */
  function transposeChord(chord, semitones, options = {}) {
    if (!chord) return '';
    const trimmed = chord.trim();
    const match = trimmed.match(CHORD_REGEX);
    if (!match) return chord;

    const rootNote = match[1];
    const modifier = match[2] || '';
    const bassNote = match[3];

    // Transponer nota raíz
    const newRoot = transposeNote(rootNote, semitones, options);

    // Transponer bajo si existe
    let newBass = '';
    if (bassNote) {
      newBass = '/' + transposeNote(bassNote, semitones, options);
    }

    return newRoot + modifier + newBass;
  }

  /**
   * Convierte un acorde entre notación Anglosajona y Latina
   */
  function convertChordNotation(chord, targetNotation) {
    return transposeChord(chord, 0, { targetNotation: targetNotation });
  }

  /**
   * Analiza una línea de texto para determinar si contiene principalmente acordes
   */
  function isChordLine(line) {
    if (!line || line.trim().length === 0) return false;
    // Eliminar corchetes si vienen formateados
    const cleanLine = line.replace(/\[|\]/g, ' ');
    const tokens = cleanLine.trim().split(/\s+/);
    if (tokens.length === 0) return false;

    let chordCount = 0;
    for (const token of tokens) {
      // Limpiar signos de puntuación periféricos
      const cleanToken = token.replace(/^[\(\[\{]+|[\)\]\},]+$/g, '');
      if (isValidChord(cleanToken)) {
        chordCount++;
      }
    }

    // Si más del 65% de las palabras son acordes, es una línea de acordes
    return (chordCount / tokens.length) >= 0.65;
  }

  /**
   * Convierte un texto con líneas intercaladas (acordes sobre letra) a formato estándar con tags [Acorde]
   */
  function mergeChordsAndLyricsToChordPro(text) {
    const lines = text.split('\n');
    const resultLines = [];
    let i = 0;

    while (i < lines.length) {
      const currentLine = lines[i];
      const nextLine = (i + 1 < lines.length) ? lines[i + 1] : null;

      // Si la línea actual parece ser de acordes y la siguiente es de letra
      if (isChordLine(currentLine) && nextLine !== null && !isChordLine(nextLine)) {
        // Combinar currentLine (acordes con espacios) con nextLine (letra)
        const merged = injectChordsIntoLyrics(currentLine, nextLine);
        resultLines.push(merged);
        i += 2; // Avanzar ambas líneas
      } else {
        resultLines.push(currentLine);
        i++;
      }
    }

    return resultLines.join('\n');
  }

  /**
   * Inserta los acordes de una línea con posiciones de espacios exactos dentro de la línea de letra
   */
  function injectChordsIntoLyrics(chordLine, lyricLine) {
    // Buscar los acordes y sus posiciones en chordLine
    const regex = /\S+/g;
    let match;
    const chords = [];

    while ((match = regex.exec(chordLine)) !== null) {
      chords.push({
        chord: match[0],
        index: match.index
      });
    }

    if (chords.length === 0) return lyricLine;

    // Insertar de atrás hacia adelante para no alterar los índices
    let result = lyricLine;
    // Si la línea de letra es más corta que la posición del último acorde, rellenar con espacios
    const maxIndex = chords[chords.length - 1].index;
    if (result.length < maxIndex) {
      result = result.padEnd(maxIndex, ' ');
    }

    for (let c = chords.length - 1; c >= 0; c--) {
      const item = chords[c];
      const pos = Math.min(item.index, result.length);
      result = result.slice(0, pos) + `[${item.chord}]` + result.slice(pos);
    }

    return result;
  }

  /**
   * Parsea un texto (con formato [Acorde]letra o líneas normales) en bloques de canciones
   * Retorna una estructura lista para renderizar
   */
  function parseSong(text) {
    const lines = text.split('\n');
    const parsedLines = [];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const rawLine = lines[lineIndex];

      // Detectar metadatos tipo {title: ...} o {key: ...}
      const metaMatch = rawLine.match(/^\s*\{([a-zA-Z_-]+):\s*(.*)\}\s*$/);
      if (metaMatch) {
        parsedLines.push({
          type: 'directive',
          name: metaMatch[1].toLowerCase(),
          value: metaMatch[2].trim()
        });
        continue;
      }

      // Detectar comentarios o encabezados de sección tipo [Verso 1], [Coro], etc.
      const sectionMatch = rawLine.match(/^\s*\[(Verso|Coro|Estribillo|Intro|Outro|Puente|Bridge|Solo|Pre-coro)[^\]]*\]\s*$/i);
      if (sectionMatch) {
        parsedLines.push({
          type: 'section',
          text: rawLine.trim()
        });
        continue;
      }

      // Si es una línea que solo tiene acordes sin corchetes
      if (isChordLine(rawLine) && !rawLine.includes('[')) {
        parsedLines.push({
          type: 'chord-only-line',
          text: rawLine
        });
        continue;
      }

      // Parsear segmentos [Acorde]Letra
      // Ejemplo: "De [Am]música [G]ligera"
      const segments = [];
      const regex = /\[(.*?)\]|([^\[]+)/g;
      let match;
      let currentChord = null;

      while ((match = regex.exec(rawLine)) !== null) {
        if (match[1] !== undefined) {
          // Es un acorde [Acorde]
          currentChord = match[1];
        } else if (match[2] !== undefined) {
          // Es letra
          segments.push({
            chord: currentChord,
            lyric: match[2]
          });
          currentChord = null;
        }
      }

      // Si quedó un acorde al final sin letra siguiente
      if (currentChord !== null) {
        segments.push({
          chord: currentChord,
          lyric: ''
        });
      }

      // Si no hubo ningún segmento (línea vacía)
      if (segments.length === 0) {
        segments.push({ chord: null, lyric: rawLine });
      }

      parsedLines.push({
        type: 'lyric-line',
        segments: segments,
        raw: rawLine
      });
    }

    return parsedLines;
  }

  /**
   * Transpone todo un texto que contenga acordes entre corchetes [C#m] o palabras de acordes
   */
  function transposeText(text, semitones, options = {}) {
    if (semitones === 0 && !options.targetNotation && options.preferSharps === undefined) {
      return text;
    }

    // Reemplazar acordes dentro de corchetes [Am7] -> [Bm7]
    let result = text.replace(/\[([a-zA-Z0-9#b\+°ºø∆\(\)\-\/]+)\]/g, (fullMatch, chordContent) => {
      if (isValidChord(chordContent, true)) {
        return `[${transposeChord(chordContent, semitones, options)}]`;
      }
      return fullMatch;
    });

    // Si hay líneas de acordes sin corchetes, transponerlas también
    const lines = result.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (isChordLine(lines[i]) && !lines[i].includes('[')) {
        lines[i] = lines[i].replace(CHORD_TOKEN_REGEX, (match, root, mod, bass) => {
          return transposeChord(match, semitones, options);
        });
      }
    }

    return lines.join('\n');
  }

  /**
   * Lista de acordes armónicos comunes para una tonalidad dada
   */
  function getScaleChords(rootNote, isMinor = false) {
    const semitone = getSemitone(rootNote);
    if (semitone === -1) return [];

    const isLatin = isLatinNote(rootNote);
    const scaleList = isLatin ? NOTES_LATIN_SHARP : NOTES_SHARP;

    // Intervalos en semitonos para escala mayor: I, ii, iii, IV, V, vi, vii°
    // Para menor: i, ii°, III, iv, v/V, VI, VII
    const intervalsMajor = [
      { offset: 0, suffix: '', name: 'I' },
      { offset: 2, suffix: 'm', name: 'ii' },
      { offset: 4, suffix: 'm', name: 'iii' },
      { offset: 5, suffix: '', name: 'IV' },
      { offset: 7, suffix: '', name: 'V' },
      { offset: 7, suffix: '7', name: 'V7' },
      { offset: 9, suffix: 'm', name: 'vi' },
      { offset: 11, suffix: 'dim', name: 'vii°' }
    ];

    const intervalsMinor = [
      { offset: 0, suffix: 'm', name: 'i' },
      { offset: 2, suffix: 'dim', name: 'ii°' },
      { offset: 3, suffix: '', name: 'III' },
      { offset: 5, suffix: 'm', name: 'iv' },
      { offset: 7, suffix: 'm', name: 'v' },
      { offset: 7, suffix: '7', name: 'V7' },
      { offset: 8, suffix: '', name: 'VI' },
      { offset: 10, suffix: '', name: 'VII' }
    ];

    const list = isMinor ? intervalsMinor : intervalsMajor;

    return list.map(item => {
      const chordRoot = scaleList[(semitone + item.offset) % 12];
      return {
        degree: item.name,
        chord: chordRoot + item.suffix
      };
    });
  }

  // Exportar el módulo
  const ChordTransposer = {
    NOTES_SHARP,
    NOTES_FLAT,
    NOTES_LATIN_SHARP,
    NOTES_LATIN_FLAT,
    NOTE_TO_SEMITONE,
    getSemitone,
    transposeNote,
    transposeChord,
    transposeText,
    convertChordNotation,
    isValidChord,
    isChordLine,
    mergeChordsAndLyricsToChordPro,
    parseSong,
    getScaleChords,
    isLatinNote,
    normalizeNoteCase
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChordTransposer;
  } else {
    global.ChordTransposer = ChordTransposer;
  }

})(typeof window !== 'undefined' ? window : globalThis);
