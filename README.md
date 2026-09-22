# 🎸 LyrChords Transposer

**LyrChords Transposer** es una aplicación moderna e interactiva diseñada para músicos, cantantes y compositores. Permite escribir y editar la letra de cualquier canción, posicionar los acordes de forma exacta **en la parte superior de cada sílaba**, y **transponerlos instantáneamente** (+1, -1 semitono o a cualquier tonalidad) para ajustar la canción a tu rango vocal o instrumento.

---

## 🚀 Cómo Ejecutar el Programa

Tienes dos formas sencillas de usar el programa:

### Opción 1: Abrir directamente en el navegador (Sin instalaciones)
Simplemente haz **doble clic** en el archivo:
```text
index.html
```
Se abrirá de inmediato en tu navegador habitual (Google Chrome, Microsoft Edge, Firefox, Brave, Safari, etc.).

### Opción 2: Usar el lanzador con servidor local en Python
Si tienes Python instalado, ejecuta en la terminal:
```bash
python run.py
```
El script iniciará un servidor web local y abrirá automáticamente tu navegador predeterminado.

---

## ✨ Características Principales

### 1. 🎵 Transposición de Acordes en Tiempo Real
- **Subir (+1) y Bajar (-1) Semitonos**: Botones dedicados para modular el tono de la canción medio tono arriba o abajo con un solo clic.
- **Selector de Tono Directo**: Elige directamente la tonalidad deseada (ej. de *Sol mayor* a *Do mayor* o *Rem*) y el sistema calculará la diferencia de semitonos de forma automática.
- **Cejilla / Capo**: Selector de traste (Traste 1 a 7) para calcular la postura relativa si tocas con cejilla en la guitarra.
- **Notación Anglo-sajona vs Latina**: Alterna entre la nomenclatura internacional (`C, D, E, F, G, A, B`) y la notación en español (`Do, Re, Mi, Fa, Sol, La, Si`).
- **Sostenidos (♯) y Bemoles (♭)**: Permite elegir la preferencia de alteraciones según el contexto musical.
- **Soporte de Acordes Complejos**: Maneja notas mayores, menores (`m`), séptimas (`7`, `maj7`, `m7`), suspendidos (`sus4`, `sus2`), disminuidos (`dim`), aumentados (`aug`), novenas (`add9`) y bajos invertidos / slash chords (ej: `G/B`, `Am7/G`, `Re/Fa#`).

### 2. 📝 Editor y Visor Sincronizado (Doble Panel)
- **Acordes Sobre la Letra**: Cada acorde se posiciona físicamente encima de la sílaba o palabra exacta mediante etiquetas estilizadas (*badges*).
- **Formato ChordPro Estándar**: Escribe acordes entre corchetes, por ejemplo:
  ```text
  [Bm]Ella dur[G]mió al ca[D]lor de las ma[A]sas
  ```
- **🪄 Asistente para Cancioneros Tradicionales (Dos Líneas)**: Si tienes una canción copiada de internet donde los acordes están en una línea y la letra en la siguiente, pulsa el botón **"Detectar acordes arriba"** y el programa fusionará automáticamente los acordes sobre la letra con las posiciones exactas.
- **Paleta de Acordes Rápidos**: En la parte superior del editor se muestran automáticamente los acordes armónicos de la escala actual (I, ii, iii, IV, V, vi, etc.). Al hacer clic en cualquiera de ellos, se inserta directamente en la posición de tu cursor.
- **Asistente "+ Insertar Acorde"**: Modal visual para armar cualquier acorde eligiendo la nota raíz, el tipo/calidad y el bajo alternativo.

### 3. 🎤 Herramientas para Tocar en Vivo
- **Auto-Scroll Manos Libres**: Desplazamiento vertical automático con control de velocidad para que leas la letra y toques tu instrumento sin necesidad de tocar la pantalla o el teclado.
- **Modo Escenario (Pantalla Completa)**: Oculta el editor para maximizar la hoja de la canción.
- **Control de Tamaño de Letra (A- / A+)**: Agranda o reduce el tamaño de texto para facilitar la lectura a distancia.
- **🖨️ Impresión / Exportar a PDF**: Hoja de estilos optimizada para imprimir canciones limpias sin botones ni barras de herramientas.
- **Auto-Guardado**: Guarda automáticamente tu trabajo en el almacenamiento local del navegador (`localStorage`) para que nunca pierdas tus ediciones.
- **Canciones de Ejemplo Precargadas**: Incluye canciones icónicas listas para probar (*"De Música Ligera"* de Soda Stereo, *"Flaca"* de Andrés Calamaro y *"Stand By Me"* de Ben E. King).

---

## 📁 Estructura del Proyecto

```text
Lyrc.Chords.Transpose/
│
├── index.html              # Interfaz gráfica principal de la aplicación
├── run.py                  # Servidor local y lanzador automático en Python
├── README.md               # Documentación completa del proyecto
│
├── css/
│   └── styles.css          # Estilos modernos, diseño responsive y modo de impresión
│
├── js/
│   ├── chord-transposer.js # Motor musical de teoría, transposición y parsing de texto
│   ├── examples.js         # Canciones de muestra precargadas
│   └── app.js              # Controlador principal, interfaz de usuario y eventos
│
└── tests/
    └── test-runner.html    # Suite de pruebas unitarias automatizadas del motor musical
```

---

## 🧪 Pruebas Unitarias
El motor musical cuenta con una suite completa de pruebas unitarias que validan:
- Transposiciones por semitonos positivas y negativas.
- Manejo de notas enarmónicas (sostenidos y bemoles).
- Acordes compuestos, séptimas y bajos invertidos (`G/B -> A/C#`).
- Conversión bidireccional entre notación latina e inglesa.
- Fusión de acordes desde texto tradicional de dos líneas.

Para correr las pruebas:
Abre el archivo `tests/test-runner.html` en tu navegador para ver los resultados en verde.

---

## 📄 Licencia
Este proyecto es de código abierto y de libre distribución para músicos, estudiantes y entusiastas de la música.
