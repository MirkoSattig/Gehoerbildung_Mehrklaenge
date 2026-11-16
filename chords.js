/* ==========================================================================
   1. AKKORD-KATALOG
   Neue Akkordtypen werden nur hier ergänzt. Kürzel (code) dürfen weder
   "_" noch "-" enthalten und müssen im audio/manifest.js verwendet werden.
   intervals = Halbtöne über dem Grundton (Nonen/Undezimen/Tredezimen
   liegen über 12) – daraus erzeugt auch der Platzhalter-Klang seine Töne.
   ========================================================================== */
const CHORD_FAMILIES = [
    { id: "sept", label: "Septakkorde" },
    { id: "none", label: "Nonakkorde" },
    { id: "ext",  label: "Undezim-/Tredezimakkorde" },
    { id: "alt",  label: "Alterierte Akkorde" }
];

const CHORD_TYPES = [
    // --- Septakkorde (4 Töne) ---
    { code: "vv",      family: "sept", short: "°7",         label: "vollverminderter Septakkord",              intervals: [0, 3, 6, 9] },
    { code: "hv",      family: "sept", short: "ø7",         label: "halbverminderter Septakkord",              intervals: [0, 3, 6, 10] },
    { code: "m7",      family: "sept", short: "m7",         label: "Mollseptakkord",                           intervals: [0, 3, 7, 10] },
    { code: "d7",      family: "sept", short: "7",          label: "Dominantseptakkord",                       intervals: [0, 4, 7, 10] },
    { code: "maj7",    family: "sept", short: "maj7",       label: "großer Durseptakkord",                     intervals: [0, 4, 7, 11] },
    { code: "mmaj7",   family: "sept", short: "m(maj7)",    label: "großer Mollseptakkord",                    intervals: [0, 3, 7, 11] },

    // --- Nonakkorde (5 Töne) ---
    { code: "d9",      family: "none", short: "9",          label: "Dominantnonakkord",                        intervals: [0, 4, 7, 10, 14] },
    { code: "d7b9",    family: "none", short: "7(b9)",      label: "Dominantseptakkord mit kleiner None",      intervals: [0, 4, 7, 10, 13] },
    { code: "maj9",    family: "none", short: "maj9",       label: "Durnonakkord",                             intervals: [0, 4, 7, 11, 14] },
    { code: "m9",      family: "none", short: "m9",         label: "Mollnonakkord",                            intervals: [0, 3, 7, 10, 14] },
    { code: "mmaj9",   family: "none", short: "m(maj9)",    label: "großer Mollnonakkord",                     intervals: [0, 3, 7, 11, 14] },

    // --- Undezim-/Tredezimakkorde (6 Töne) ---
    { code: "m11",     family: "ext",  short: "m11",        label: "Moll-Undezimakkord",                       intervals: [0, 3, 7, 10, 14, 17] },
    { code: "d11",     family: "ext",  short: "11",         label: "Dominantundezimakkord",                    intervals: [0, 4, 7, 10, 14, 17] },
    { code: "m13",     family: "ext",  short: "m13",        label: "Moll-Tredezimakkord",                      intervals: [0, 3, 7, 10, 14, 21] },
    { code: "d13",     family: "ext",  short: "13",         label: "Dominanttredezimakkord",                   intervals: [0, 4, 7, 10, 14, 21] },
    { code: "maj13",   family: "ext",  short: "maj13",      label: "Dur-Tredezimakkord",                       intervals: [0, 4, 7, 11, 14, 21] },

    // --- Alterierte Akkorde ---
    { code: "d7b5",    family: "alt",  short: "7(b5)",      label: "Dominantseptakkord mit verminderter Quinte",  intervals: [0, 4, 6, 10] },
    { code: "d7s5",    family: "alt",  short: "7(#5)",      label: "Dominantseptakkord mit übermäßiger Quinte",   intervals: [0, 4, 8, 10] },
    { code: "d7s9",    family: "alt",  short: "7(#9)",      label: "Dominantseptakkord mit übermäßiger None",     intervals: [0, 4, 7, 10, 15] },
    { code: "d7s11",   family: "alt",  short: "7(#11)",     label: "Dominantseptakkord mit übermäßiger Undezime", intervals: [0, 4, 7, 10, 18] },
    { code: "maj7s11", family: "alt",  short: "maj7(#11)",  label: "Durseptakkord mit übermäßiger Undezime",      intervals: [0, 4, 7, 11, 18] },
    { code: "d7alt",   family: "alt",  short: "7alt",       label: "alterierter Dominantseptakkord (b5, b9)",     intervals: [0, 4, 6, 10, 13] }
];

const CHORD_LOOKUP = {};
CHORD_TYPES.forEach(c => { CHORD_LOOKUP[c.code] = c; });

const LEVEL_LABELS = { 1: "Einzelakkord", 2: "Zwei Akkorde", 3: "Akkordfolge", 4: "Literaturbeispiel" };

