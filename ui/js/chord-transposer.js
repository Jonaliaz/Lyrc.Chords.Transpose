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

  // Modificadores musicales válidos (evita que palabras en español o inglés como "amor", "canto", "esta" coincidan)
  const CHORD_MODIFIER_REGEX_STR = '(?:(?:maj|min|m|M|sus|add|dim|aug|dom|lyd|phryg)?[0-9]*(?:maj7|maj9|maj11|maj13|maj|min|m7b5|m7#5|m7|m9|m11|m13|m6|m|dim7|dim|aug7|aug|sus2|sus4|sus|add9|add2|add4|add11|add|6\\/9|7\\/9|7-5|7\\+5|7-9|7\\+9|7b5|7#5|7b9|7#9|7#11|7b13|9b5|9#5|11b9|13b9|5|6|7|9|11|13|°|º|ø|∆|\\+|-|\\([b#]?[0-9a-zA-Z\\+]+\\))*)';

  // Regex para un acorde completo:
  // Grupo 1: Nota raíz
  // Grupo 2: Modificadores/sufijos válidos (m, maj7, sus4, dim, 7b5, etc.)
  // Grupo 3: Bajo alternativo opcional (/G, /Fa#, etc.)
  const CHORD_REGEX = new RegExp(
    `^(${ROOT_NOTES_REGEX_STR})(${CHORD_MODIFIER_REGEX_STR})(?:\\/(${ROOT_NOTES_REGEX_STR}))?$`,
    'i'
  );

  // Regex para encontrar acordes en un texto libre (palabras sueltas)
  const CHORD_TOKEN_REGEX = new RegExp(
    `\\b(${ROOT_NOTES_REGEX_STR})(${CHORD_MODIFIER_REGEX_STR})(?:\\/(${ROOT_NOTES_REGEX_STR}))?\\b`,
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
   * Analiza una línea de texto para determinar si contiene únicamente acordes
   */
  function isChordLine(line) {
    if (!line || typeof line !== 'string') return false;
    const trimmed = line.trim();
    if (trimmed.length === 0) return false;

    // Si tiene corchetes, verificar si son exclusivamente acordes
    if (trimmed.includes('[')) {
      return isBracketChordLine(trimmed);
    }

    // Dividir por espacios
    const tokens = trimmed.split(/\s+/);
    if (tokens.length === 0) return false;

    let validChords = 0;
    for (const token of tokens) {
      // Ignorar barras de compás o separadores musicales como |, -, /, :
      if (/^[\s\-|/\.:()]+$/.test(token)) {
        continue;
      }
      const cleanToken = token.replace(/^[\(\[\{]+|[\)\]\},]+$/g, '');
      if (isValidChord(cleanToken)) {
        validChords++;
      } else {
        // Si hay al menos una palabra que no es acorde ni separador, es letra
        return false;
      }
    }

    // Debe tener al menos 1 acorde válido y ningún texto ajeno
    return validChords > 0;
  }

  /**
   * Determina si una línea está compuesta únicamente por acordes entre corchetes
   */
  function isBracketChordLine(line) {
    if (!line || !line.includes('[')) return false;
    // Si quitamos los corchetes [Acorde] y solo quedan espacios o símbolos musicales
    const stripped = line.replace(/\[(.*?)\]/g, '').trim();
    if (stripped === '' || /^[\s\-|/\.:()]*$/.test(stripped)) {
      const matches = line.match(/\[(.*?)\]/g);
      if (matches && matches.length > 0) {
        return matches.every(m => {
          const chordContent = m.replace(/\[|\]/g, '').trim();
          return isValidChord(chordContent, true);
        });
      }
    }
    return false;
  }

  /**
   * Determina si una línea es un encabezado de sección musical [Intro], [Verso], etc.
   */
  function isSectionHeader(line) {
    if (!line) return false;
    return /^\s*\[(Verso|Coro|Estribillo|Intro|Outro|Puente|Bridge|Solo|Pre-coro|Pre-chorus|Chorus|Verse|Estrofa|Coda|Final|Instrumental)[^\]]*\]\s*$/i.test(line);
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

      const currentIsChords = isChordLine(currentLine) || isBracketChordLine(currentLine);
      const nextIsLyric = nextLine !== null &&
        nextLine.trim().length > 0 &&
        !nextLine.match(/^\s*\{([a-zA-Z_-]+):/) &&
        !isSectionHeader(nextLine) &&
        !(isChordLine(nextLine) || isBracketChordLine(nextLine));

      if (currentIsChords && nextIsLyric) {
        // Combinar currentLine con nextLine
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
    const chords = [];

    // Si la línea tiene formato de corchetes [Bm]   [G]
    if (chordLine.includes('[') && chordLine.includes(']')) {
      const regex = /\[(.*?)\]/g;
      let match;
      while ((match = regex.exec(chordLine)) !== null) {
        const chord = match[1].trim();
        if (isValidChord(chord, true)) {
          chords.push({ chord: chord, index: match.index });
        }
      }
    } else {
      // Formato texto plano libre sin corchetes
      const regex = /\S+/g;
      let match;
      while ((match = regex.exec(chordLine)) !== null) {
        const token = match[0].replace(/^[\(\[\{]+|[\)\]\},]+$/g, '');
        if (isValidChord(token)) {
          chords.push({ chord: token, index: match.index });
        }
      }
    }

    if (chords.length === 0) return lyricLine;

    // Insertar de atrás hacia adelante para no alterar los índices
    let result = lyricLine;
    const maxIndex = chords[chords.length - 1].index;
    if (result.length < maxIndex) {
      result = result.padEnd(maxIndex, ' ');
    }

    for (let c = chords.length - 1; c >= 0; c--) {
      const item = chords[c];
      const pos = Math.min(item.index, result.length);
      const cleanChord = item.chord.replace(/^\[+|\]+$/g, '').trim();
      result = result.slice(0, pos) + `[${cleanChord}]` + result.slice(pos);
    }

    return result;
  }

  /**
   * Parsea los segmentos [Acorde]Letra de una línea
   */
  function parseLineSegments(rawLine) {
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

    return segments;
  }

  /**
   * Parsea un texto (con formato [Acorde]letra, acordes en dos líneas o líneas normales)
   * Retorna una estructura lista para renderizar
   */
  function parseSong(text) {
    const lines = text.split('\n');
    const parsedLines = [];
    let lineIndex = 0;

    while (lineIndex < lines.length) {
      const rawLine = lines[lineIndex];

      // Detectar metadatos tipo {title: ...} o {key: ...}
      const metaMatch = rawLine.match(/^\s*\{([a-zA-Z_-]+):\s*(.*)\}\s*$/);
      if (metaMatch) {
        parsedLines.push({
          type: 'directive',
          name: metaMatch[1].toLowerCase(),
          value: metaMatch[2].trim()
        });
        lineIndex++;
        continue;
      }

      // Detectar comentarios o encabezados de sección tipo [Verso 1], [Coro], [Estrofa], etc.
      if (isSectionHeader(rawLine)) {
        parsedLines.push({
          type: 'section',
          text: rawLine.trim()
        });
        lineIndex++;
        continue;
      }

      // Detectar si la línea actual es de acordes (con o sin corchetes)
      const currentIsChords = isChordLine(rawLine) || isBracketChordLine(rawLine);
      const nextLine = (lineIndex + 1 < lines.length) ? lines[lineIndex + 1] : null;

      if (currentIsChords) {
        // Verificar si la línea siguiente es letra para fusionar automáticamente
        const nextIsLyric = nextLine !== null &&
          nextLine.trim().length > 0 &&
          !nextLine.match(/^\s*\{([a-zA-Z_-]+):/) &&
          !isSectionHeader(nextLine) &&
          !(isChordLine(nextLine) || isBracketChordLine(nextLine));

        if (nextIsLyric) {
          // Fusionar acordes alineados sobre la letra
          const merged = injectChordsIntoLyrics(rawLine, nextLine);
          parsedLines.push({
            type: 'lyric-line',
            segments: parseLineSegments(merged),
            raw: merged
          });
          lineIndex += 2;
          continue;
        } else {
          // Línea de solo acordes independiente (Intro, Solo, Outro, etc.)
          const cleanChordText = rawLine.includes('[') ? rawLine.replace(/\[(.*?)\]/g, '$1') : rawLine;
          parsedLines.push({
            type: 'chord-only-line',
            text: cleanChordText
          });
          lineIndex++;
          continue;
        }
      }

      // Línea de letra normal (o con formato [Acorde]Letra ya incorporado)
      parsedLines.push({
        type: 'lyric-line',
        segments: parseLineSegments(rawLine),
        raw: rawLine
      });
      lineIndex++;
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
    isBracketChordLine,
    isSectionHeader,
    injectChordsIntoLyrics,
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
