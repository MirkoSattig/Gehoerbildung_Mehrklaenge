/* ==========================================================================
   AUDIO-MANIFEST
   Eine Zeile je Hörbeispiel. Die Dateien liegen im selben Ordner (audio/).
   Fehlt eine Datei, spielt das Tool einen als "Platzhalter" markierten
   synthetischen Klang.

   Felder:
     file       Dateiname (Unterordner erlaubt, z. B. "none/1_020_d9.mp3")
     level      1 = Einzelakkord, 2 = Zwei Akkorde, 3 = Akkordfolge (3+),
                4 = Literaturbeispiel
     chords     Akkord-Kürzel in Hörreihenfolge (siehe CHORD_TYPES in index.html)
     title      (optional) Werk bzw. Hinweis, wird nach der Antwort angezeigt
   Weitere optionale Felder (noch nicht ausgewertet, aber schon erfassbar):
     roots      Grundtöne je Akkord, z. B. ["C", "F"]
     difficulty 1–3
     tags       frei wählbare Schlagwörter
   ========================================================================== */
window.AUDIO_MANIFEST = [
    // --- Stufe 1: Einzelakkorde (Septakkorde) ---
    { file: "1_001_vv.mp3",    level: 1, chords: ["vv"] },
    { file: "1_002_hv.mp3",    level: 1, chords: ["hv"] },
    { file: "1_003_m7.mp3",    level: 1, chords: ["m7"] },
    { file: "1_004_d7.mp3",    level: 1, chords: ["d7"] },
    { file: "1_005_maj7.mp3",  level: 1, chords: ["maj7"] },
    { file: "1_006_mmaj7.mp3", level: 1, chords: ["mmaj7"] },
    { file: "1_007_vv.mp3",    level: 1, chords: ["vv"] },
    { file: "1_008_hv.mp3",    level: 1, chords: ["hv"] },
    { file: "1_009_m7.mp3",    level: 1, chords: ["m7"] },
    { file: "1_010_d7.mp3",    level: 1, chords: ["d7"] },
    { file: "1_011_maj7.mp3",  level: 1, chords: ["maj7"] },
    { file: "1_012_mmaj7.mp3", level: 1, chords: ["mmaj7"] },

    // --- Stufe 1: Einzelakkorde (Nonakkorde) ---
    { file: "1_101_d9.mp3",    level: 1, chords: ["d9"] },
    { file: "1_102_d7b9.mp3",  level: 1, chords: ["d7b9"] },
    { file: "1_103_maj9.mp3",  level: 1, chords: ["maj9"] },
    { file: "1_104_m9.mp3",    level: 1, chords: ["m9"] },
    { file: "1_105_mmaj9.mp3", level: 1, chords: ["mmaj9"] },

    // --- Stufe 1: Einzelakkorde (Undezim-/Tredezimakkorde) ---
    { file: "1_201_m11.mp3",   level: 1, chords: ["m11"] },
    { file: "1_202_d11.mp3",   level: 1, chords: ["d11"] },
    { file: "1_203_m13.mp3",   level: 1, chords: ["m13"] },
    { file: "1_204_d13.mp3",   level: 1, chords: ["d13"] },
    { file: "1_205_maj13.mp3", level: 1, chords: ["maj13"] },

    // --- Stufe 1: Einzelakkorde (alterierte Akkorde) ---
    { file: "1_301_d7b5.mp3",    level: 1, chords: ["d7b5"] },
    { file: "1_302_d7s5.mp3",    level: 1, chords: ["d7s5"] },
    { file: "1_303_d7s9.mp3",    level: 1, chords: ["d7s9"] },
    { file: "1_304_d7s11.mp3",   level: 1, chords: ["d7s11"] },
    { file: "1_305_maj7s11.mp3", level: 1, chords: ["maj7s11"] },
    { file: "1_306_d7alt.mp3",   level: 1, chords: ["d7alt"] },

    // --- Stufe 2: Abfolge zweier Akkorde ---
    { file: "2_001_hv-d7.mp3",     level: 2, chords: ["hv", "d7"] },
    { file: "2_002_m7-d7.mp3",     level: 2, chords: ["m7", "d7"] },
    { file: "2_003_d7-maj7.mp3",   level: 2, chords: ["d7", "maj7"] },
    { file: "2_004_vv-m7.mp3",     level: 2, chords: ["vv", "m7"] },
    { file: "2_005_m7-mmaj7.mp3",  level: 2, chords: ["m7", "mmaj7"] },
    { file: "2_006_maj7-hv.mp3",   level: 2, chords: ["maj7", "hv"] },
    { file: "2_007_hv-vv.mp3",     level: 2, chords: ["hv", "vv"] },
    { file: "2_008_mmaj7-d7.mp3",  level: 2, chords: ["mmaj7", "d7"] },
    { file: "2_009_d7-m7.mp3",     level: 2, chords: ["d7", "m7"] },
    { file: "2_010_maj7-m7.mp3",   level: 2, chords: ["maj7", "m7"] },
    { file: "2_101_m9-d9.mp3",     level: 2, chords: ["m9", "d9"] },
    { file: "2_102_d9-maj9.mp3",   level: 2, chords: ["d9", "maj9"] },
    { file: "2_103_d7b9-m9.mp3",   level: 2, chords: ["d7b9", "m9"] },
    { file: "2_201_m11-d13.mp3",   level: 2, chords: ["m11", "d13"] },
    { file: "2_301_d7s9-maj7s11.mp3", level: 2, chords: ["d7s9", "maj7s11"] },
    { file: "2_302_d7alt-m9.mp3",  level: 2, chords: ["d7alt", "m9"] },

    // --- Stufe 3: Akkordfolgen (3 oder mehr Akkorde, ohne Literaturbezug) ---
    { file: "3_001_m9-d9-maj9.mp3",          level: 3, chords: ["m9", "d9", "maj9"] },
    { file: "3_002_m7-d7-maj7-hv.mp3",       level: 3, chords: ["m7", "d7", "maj7", "hv"] },
    { file: "3_101_m11-d13-maj13.mp3",       level: 3, chords: ["m11", "d13", "maj13"] },
    { file: "3_201_m9-d7alt-maj7s11.mp3",    level: 3, chords: ["m9", "d7alt", "maj7s11"] },

    // --- Stufe 4: Literaturbeispiele ---
    { file: "4_001_hv-d7_Wagner-Tristan-und-Isolde.mp3",           level: 4, chords: ["hv", "d7"],                    title: "Wagner: Tristan und Isolde" },
    { file: "4_002_maj7-d7-m7_Bach-WTK-I-C-Dur.mp3",                level: 4, chords: ["maj7", "d7", "m7"],            title: "Bach: Wohltemperiertes Klavier I, C-Dur" },
    { file: "4_003_hv-d7-m7_Bach-WTK-I-c-Moll.mp3",                 level: 4, chords: ["hv", "d7", "m7"],              title: "Bach: Wohltemperiertes Klavier I, c-Moll" },
    { file: "4_004_d7-vv-d7_Chopin-Prelude-op28-4.mp3",             level: 4, chords: ["d7", "vv", "d7"],              title: "Chopin: Prélude op. 28/4" },
    { file: "4_005_m7-d7-maj7_Ravel-Pavane.mp3",                    level: 4, chords: ["m7", "d7", "maj7"],            title: "Ravel: Pavane" },
    { file: "4_006_mmaj7-m7-hv-d7_c-Moll-Linienklischee.mp3",       level: 4, chords: ["mmaj7", "m7", "hv", "d7"],     title: "c-Moll-Linienklischee" },
    { file: "4_007_hv-vv-m7_Brahms-Intermezzo-op118-2.mp3",         level: 4, chords: ["hv", "vv", "m7"],              title: "Brahms: Intermezzo op. 118/2" },
    { file: "4_008_m7-d7-m7-d7_Mozart-Fantasie-KV475.mp3",          level: 4, chords: ["m7", "d7", "m7", "d7"],        title: "Mozart: Fantasie KV 475" }
];
