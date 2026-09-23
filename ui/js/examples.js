/**
 * Canciones de ejemplo precargadas para probar la transposición y el editor
 */
const SONG_EXAMPLES = [
  {
    id: 'musica-ligera',
    title: 'De Música Ligera',
    artist: 'Soda Stereo',
    key: 'Bm',
    timeSignature: '4/4',
    content: `{title: De Música Ligera}
{artist: Soda Stereo}
{key: Bm}

[Intro]
[Bm]   [G]   [D]   [A]
[Bm]   [G]   [D]   [A]

[Verso 1]
[Bm]Ella dur[G]mió
al ca[D]lor de las ma[A]sas
[Bm]y yo des[G]perté
quer[D]iendo soñ[A]arla.

[Bm]Algún tiem[G]po atrás
pen[D]sé en escri[A]birle
[Bm]que aún un he[G]chizo
de a[D]mor de na[A]da nos salva.

[Coro]
[Bm]Nada más que[G]da...
[D]   De música li[A]gera.
[Bm]Nada más que[G]da...
[D]   De música li[A]gera.
[Bm]   [G]   [D]   [A]

[Verso 2]
[Bm]No le en[G]vié
cen[D]izas de ro[A]sas
[Bm]ni la bus[G]qué
en tiem[D]pos tan tris[A]tes.

[Bm]Las cosas más sim[G]ples
que el vi[D]ento arre[A]bata
[Bm]no volver[G]án jamás
a sen[D]tirse las mis[A]mas.

[Coro]
[Bm]Nada más que[G]da...
[D]   De música li[A]gera.
[Bm]Nada más que[G]da...
[D]   De música li[A]gera.
[Bm]Nada más que[G]da...
[D]   De música li[A]gera.
[Bm]Nada más que[G]da...
[D]   De música li[A]gera.

[Outro]
[Bm]   [G]   [D]   [A]
[Bm]   ¡Gracias... totales!
`
  },
  {
    id: 'flaca',
    title: 'Flaca',
    artist: 'Andrés Calamaro',
    key: 'G',
    timeSignature: '4/4',
    content: `{title: Flaca}
{artist: Andrés Calamaro}
{key: G}

[Intro]
[G]   [B7]   [Em]   [C]   [G]   [D]   [G]   [D7]

[Verso 1]
[G]Flaca, no me cl[B7]aves
tus puñales [Em]por la espalda,
tan pro[C]fundo,
no me d[G]uelen, no me h[D]acen más da[G]ño.[D7]

[Verso 2]
[G]Días, en la v[B7]ida,
tan con[Em]fusos,
promet[C]iste un cuarto de h[G]ora
en mi cab[D]aña, y te qu[G]edaste diez añ[D7]os.

[Coro]
[G]Aunque casi me h[B7]ace mal,
casi conseg[Em]uís vaciarme,
te per[C]dono de momento,
[G]olvidar no voy a o[D]lvidar,
por lo m[G]enos esta t[D7]arde.

[Puente]
[G]Flaca, no me cl[B7]aves
tus puñales [Em]por la espalda,
tan pro[C]fundo,
no me d[G]uelen, no me h[D]acen más da[G]ño.
`
  },
  {
    id: 'stand-by-me',
    title: 'Stand By Me',
    artist: 'Ben E. King',
    key: 'A',
    timeSignature: '4/4',
    content: `{title: Stand By Me}
{artist: Ben E. King}
{key: A}

[Intro]
[A]   [F#m]   [D]   [E7]   [A]

[Verso 1]
When the [A]night has come
And the [F#m]land is dark
And the [D]moon is the [E7]only light we'll [A]see.

No I [A]won't be afraid,
No I [F#m]won't be afraid
Just as [D]long as you [E7]stand, stand by [A]me.

[Coro]
So darling, darling, [A]stand by me,
Oh [F#m]stand by me.
Oh [D]stand, [E7]stand by me,
[A]Stand by me.

[Verso 2]
If the [A]sky that we look upon
Should [F#m]tumble and fall
Or the [D]mountains should [E7]crumble to the [A]sea.

I won't [A]cry, I won't cry,
No I [F#m]won't shed a tear
Just as [D]long as you [E7]stand, stand by [A]me.
`
  },
  {
    id: 'plantilla-vacia',
    title: 'Nueva Canción',
    artist: 'Mi Artista',
    key: 'C',
    timeSignature: '4/4',
    content: `{title: Nueva Canción}
{artist: Mi Artista}
{key: C}

[Intro]
[C]   [G]   [Am]   [F]

[Verso 1]
Escribe la [C]letra de tu canción [G]aquí
y coloca los [Am]acordes entre corchetes [F]así.

[Coro]
[C]¡Los acordes subirán [G]y bajarán
al pulsar [Am]las herramientas de [F]transposición!
`
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SONG_EXAMPLES;
}
