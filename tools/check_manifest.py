#!/usr/bin/env python3
"""Prüft audio/manifest.js gegen chords.js und den Ordner audio/.

Aufruf (im Projektordner):   python tools/check_manifest.py
Optional:                    python tools/check_manifest.py --strict   (fehlende Dateien = Fehler)

Meldet:
  - unbekannte Akkord-Kürzel, ungültige Stufen, doppelte Dateinamen
  - Kürzel mit "-" oder "_" im Katalog
  - fehlende Audiodateien (Warnung; mit --strict Fehler)
  - Audiodateien im Ordner, die nicht im Manifest stehen
  - Akkordtypen ohne Einzelakkord-Beispiel (nötig für den Vergleichsmodus)
Rückgabewert 1 bei Fehlern, sonst 0.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIO_EXT = {".mp3", ".wav", ".ogg", ".m4a", ".flac"}


def load_catalog():
    text = (ROOT / "chords.js").read_text(encoding="utf-8")
    types = re.findall(r'code:\s*"([^"]*)"\s*,\s*family:\s*"([^"]*)"', text)
    families = re.findall(r'\{\s*id:\s*"([^"]*)"\s*,\s*label:', text)
    levels = [int(n) for n in re.findall(r'(\d)\s*:\s*"[^"]+"', re.search(r"LEVEL_LABELS\s*=\s*\{(.*?)\}", text, re.S).group(1))]
    return types, families, levels


def load_manifest():
    text = (ROOT / "audio" / "manifest.js").read_text(encoding="utf-8")
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"^\s*//.*$", "", text, flags=re.M)
    entries = []
    for block in re.findall(r"\{[^{}]*\}", text):
        f = re.search(r'file:\s*"([^"]*)"', block)
        lv = re.search(r"level:\s*(\d+)", block)
        ch = re.search(r"chords:\s*\[([^\]]*)\]", block)
        entries.append({
            "file": f.group(1) if f else "",
            "level": int(lv.group(1)) if lv else None,
            "chords": re.findall(r'"([^"]*)"', ch.group(1)) if ch else [],
        })
    return entries


def main():
    strict = "--strict" in sys.argv
    errors, warnings = [], []

    types, families, levels = load_catalog()
    codes = [c for c, _ in types]
    for code, fam in types:
        if "-" in code or "_" in code:
            errors.append(f"Katalog: Kürzel '{code}' enthält '-' oder '_'")
        if fam not in families:
            errors.append(f"Katalog: '{code}' hat unbekannte Familie '{fam}'")
    for dup in {c for c in codes if codes.count(c) > 1}:
        errors.append(f"Katalog: Kürzel '{dup}' kommt mehrfach vor")

    entries = load_manifest()
    seen = set()
    single = {c: 0 for c in codes}
    for e in entries:
        name = e["file"] or "(ohne Dateiname)"
        if not e["file"]:
            errors.append("Eintrag ohne Dateiname")
            continue
        if e["file"] in seen:
            errors.append(f"{name}: doppelt im Manifest")
        seen.add(e["file"])
        if e["level"] not in levels:
            errors.append(f"{name}: ungültige Stufe {e['level']}")
        if not e["chords"]:
            errors.append(f"{name}: keine Akkorde")
        unknown = [c for c in e["chords"] if c not in codes]
        if unknown:
            errors.append(f"{name}: unbekannte Kürzel {', '.join(unknown)}")
        if e["level"] == 1 and len(e["chords"]) != 1:
            errors.append(f"{name}: Stufe 1 braucht genau einen Akkord")
        if e["level"] == 2 and len(e["chords"]) != 2:
            errors.append(f"{name}: Stufe 2 braucht genau zwei Akkorde")
        if e["level"] in (3, 4) and len(e["chords"]) < 2:
            errors.append(f"{name}: Stufe {e['level']} braucht mindestens zwei Akkorde")
        if e["level"] == 1 and len(e["chords"]) == 1 and e["chords"][0] in single:
            single[e["chords"][0]] += 1
        if not (ROOT / "audio" / e["file"]).is_file():
            (errors if strict else warnings).append(f"{name}: Datei fehlt in audio/ (Platzhalter-Klang)")

    audio_dir = ROOT / "audio"
    for p in sorted(audio_dir.rglob("*")):
        if p.is_file() and p.suffix.lower() in AUDIO_EXT:
            rel = p.relative_to(audio_dir).as_posix()
            if rel not in seen:
                warnings.append(f"{rel}: liegt in audio/, steht aber nicht im Manifest")

    for code, n in single.items():
        if n == 0:
            warnings.append(f"Kein Einzelakkord-Beispiel (Stufe 1) für '{code}' – Vergleichsmodus kann ihn nicht spielen")

    print(f"{len(entries)} Manifest-Einträge, {len(codes)} Akkordtypen geprüft.")
    for w in warnings:
        print("  Warnung:", w)
    for e in errors:
        print("  FEHLER: ", e)
    print(f"{len(errors)} Fehler, {len(warnings)} Warnungen.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
