/* ==========================================================================
   2. HILFSFUNKTIONEN
   ========================================================================== */
function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, ch => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    ));
}

// Fisher-Yates (unverzerrtes Mischen)
function shuffle(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function hashString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
}

/* ==========================================================================
   3. AUDIO-MANIFEST (audio/manifest.js)
   ========================================================================== */
const manifestProblems = [];

function parseManifestEntry(entry) {
    const file = String((entry && entry.file) || '').trim();
    const chords = Array.isArray(entry && entry.chords)
        ? entry.chords.map(c => String(c).trim().toLowerCase())
        : [];
    const unknown = chords.filter(c => !CHORD_LOOKUP[c]);
    const level = entry && entry.level;

    if (!file || chords.length === 0 || unknown.length > 0 || !LEVEL_LABELS[level]) {
        const reason = !file ? 'kein Dateiname'
            : chords.length === 0 ? 'keine Akkorde'
            : unknown.length > 0 ? `unbekannte Kürzel: ${unknown.join(', ')}`
            : `ungültige Stufe: ${level}`;
        manifestProblems.push(`${file || '(ohne Dateiname)'}: ${reason}`);
        return null;
    }

    return {
        filename: file,
        src: `audio/${file}`,
        level,
        seed: hashString(file),
        chords,
        families: [...new Set(chords.map(c => CHORD_LOOKUP[c].family))],
        title: entry.title || null
    };
}

const PARSED_POOL = (window.AUDIO_MANIFEST || []).map(parseManifestEntry).filter(Boolean);
if (manifestProblems.length) console.warn('Manifest-Probleme:\n' + manifestProblems.join('\n'));

/* ==========================================================================
   4. SPIELZUSTAND & ABLAUFSTEUERUNG
   ========================================================================== */
let session = {
    level: 1,
    families: [],
    total: 10,
    tasks: [],
    index: 0,
    selections: [],
    evaluated: false,
    history: []
};

const audioEl = document.getElementById('audio-player');
let mode = 'train';

/* ==========================================================================
   4a. LERNSTAND (localStorage) & GEWICHTETE AUFGABENWAHL
   ========================================================================== */
const STATS_KEY = 'akkordTrainer.stats.v1';

function loadStats() {
    try {
        const raw = localStorage.getItem(STATS_KEY);
        if (raw) {
            const s = JSON.parse(raw);
            if (s && s.types && s.confusions) return s;
        }
    } catch (e) { /* Speicher nicht verfügbar – ohne Persistenz weiterarbeiten */ }
    return { types: {}, confusions: {} };
}

let stats = loadStats();

function saveStats() {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) { /* ignorieren */ }
}

function recordResult(task, userChords) {
    task.chords.forEach((solution, idx) => {
        const given = userChords[idx];
        const t = stats.types[solution] || (stats.types[solution] = { right: 0, total: 0 });
        t.total++;
        if (given === solution) {
            t.right++;
        } else {
            const key = `${solution}>${given}`;
            stats.confusions[key] = (stats.confusions[key] || 0) + 1;
        }
    });
    saveStats();
}

function resetStats() {
    if (!confirm('Gespeicherten Lernstand wirklich löschen?')) return;
    stats = { types: {}, confusions: {} };
    saveStats();
    renderProgress();
}

// Fehlerquote je Typ; unbekannte Typen gelten als leicht erhöht, damit sie auch vorkommen
function taskWeight(task) {
    const parts = task.chords.map(code => {
        const s = stats.types[code];
        if (!s || s.total === 0) return 1.5;
        return 1 + 4 * (1 - s.right / s.total);
    });
    return parts.reduce((a, b) => a + b, 0) / parts.length;
}

function weightedPick(candidates, count) {
    const result = [];
    let pool = [...candidates];
    for (let i = 0; i < count; i++) {
        if (pool.length === 0) pool = [...candidates];
        const weights = pool.map(taskWeight);
        let r = Math.random() * weights.reduce((a, b) => a + b, 0);
        let idx = 0;
        for (; idx < pool.length - 1; idx++) {
            r -= weights[idx];
            if (r < 0) break;
        }
        result.push(pool.splice(idx, 1)[0]);
    }
    return result;
}

function renderProgress() {
    const body = document.getElementById('progress-body');
    const rows = CHORD_TYPES.filter(t => stats.types[t.code] && stats.types[t.code].total > 0);

    if (rows.length === 0) {
        body.innerHTML = '<p class="text-base text-slate-600 md:col-span-2">Noch keine Daten – löse zuerst ein paar Aufgaben im Modus „Üben“.</p>';
        return;
    }

    const typeHtml = rows.map(t => {
        const s = stats.types[t.code];
        const pct = Math.round((s.right / s.total) * 100);
        const color = pct >= 80 ? 'bg-emerald-600' : pct >= 50 ? 'bg-amber-500' : 'bg-red-600';
        return `
            <li class="py-1.5">
                <div class="flex items-baseline justify-between gap-3">
                    <span>${t.label}</span>
                    <span class="tabular-nums font-semibold">${s.right} / ${s.total} (${pct} %)</span>
                </div>
                <div class="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden"><div class="${color} h-full" style="width:${pct}%"></div></div>
            </li>`;
    }).join('');

    const confHtml = Object.entries(stats.confusions)
        .filter(([key]) => { const [a, b] = key.split('>'); return CHORD_LOOKUP[a] && CHORD_LOOKUP[b]; })
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, n]) => {
            const [a, b] = key.split('>');
            return `<li class="py-1"><span class="font-semibold">${CHORD_LOOKUP[a].label}</span> gehört als <span class="text-red-800">${CHORD_LOOKUP[b].label}</span> <span class="text-slate-500">(${n}×)</span></li>`;
        }).join('');

    body.innerHTML = `
        <div>
            <h3 class="text-base font-bold text-slate-800 mb-1">Trefferquote je Akkordtyp</h3>
            <ul class="divide-y divide-slate-100 text-base">${typeHtml}</ul>
        </div>
        <div>
            <h3 class="text-base font-bold text-slate-800 mb-1">Häufigste Verwechslungen</h3>
            ${confHtml ? `<ul class="divide-y divide-slate-100 text-base">${confHtml}</ul>` : '<p class="text-base text-slate-600">Bisher keine Verwechslungen.</p>'}
        </div>`;
}

/* ==========================================================================
   4b. MODUSWECHSEL (ÜBEN / VERGLEICHEN / LERNSTAND)
   ========================================================================== */
function setMode(newMode) {
    mode = newMode;
    cmpToken++;
    stopAudio();
    ['train', 'compare', 'progress'].forEach(m => {
        document.getElementById(`mode-${m}`).classList.toggle('hidden', m !== newMode);
    });
    document.querySelectorAll('.mode-tab').forEach(b => {
        b.classList.toggle('is-active', b.dataset.mode === newMode);
    });
    if (newMode === 'progress') renderProgress();
    if (newMode === 'compare') updateCompareInfo();
}

/* ==========================================================================
   4c. VERGLEICHSMODUS
   ========================================================================== */
let cmpToken = 0;

function renderCompareOptions() {
    const html = CHORD_FAMILIES.map(f => `
        <optgroup label="${f.label}">
            ${CHORD_TYPES.filter(t => t.family === f.id).map(t => `<option value="${t.code}">${t.label} (${t.short})</option>`).join('')}
        </optgroup>`).join('');
    const a = document.getElementById('cmp-a');
    const b = document.getElementById('cmp-b');
    a.innerHTML = html;
    b.innerHTML = html;
    a.value = 'm7';
    b.value = 'd7';
    a.onchange = b.onchange = updateCompareInfo;
}

function updateCompareInfo() {
    const line = (name, code) => {
        const t = CHORD_LOOKUP[code];
        return `<div><span class="font-semibold">${name}:</span> ${t.label} – Halbtöne über dem Grundton: ${t.intervals.join(', ')} (${t.intervals.length} Töne)</div>`;
    };
    document.getElementById('cmp-info').innerHTML =
        line('A', document.getElementById('cmp-a').value) + line('B', document.getElementById('cmp-b').value);
}

function pickReference(code) {
    const options = PARSED_POOL.filter(t => t.level === 1 && t.chords.length === 1 && t.chords[0] === code);
    return options.length ? options[Math.floor(Math.random() * options.length)] : null;
}

function playCompare(which) {
    const codes = { a: document.getElementById('cmp-a').value, b: document.getElementById('cmp-b').value };
    const seq = which === 'ab' ? ['a', 'b'] : [which];
    const status = document.getElementById('cmp-status');
    const token = ++cmpToken;

    const playStep = (i) => {
        if (token !== cmpToken) return;
        const code = codes[seq[i]];
        const task = pickReference(code);
        if (!task) {
            status.textContent = `Für „${CHORD_LOOKUP[code].label}“ gibt es noch kein Einzelakkord-Beispiel.`;
            return;
        }
        status.textContent = `Spielt ${seq[i].toUpperCase()}: ${CHORD_LOOKUP[code].label}`;
        prepareTaskAudio(task, true, false);
        audioEl.onended = () => {
            if (token !== cmpToken) return;
            if (i + 1 < seq.length) {
                setTimeout(() => playStep(i + 1), 500);
            } else {
                status.textContent = '';
            }
        };
    };
    playStep(0);
}

function renderFamilyFilter() {
    const box = document.getElementById('family-filter');
    box.innerHTML = CHORD_FAMILIES.map(f => `
        <label class="family-check">
            <input type="checkbox" value="${f.id}" checked onchange="startNewSession()">
            <span>${f.label}</span>
        </label>
    `).join('');
}

function getSelectedFamilies() {
    return [...document.querySelectorAll('#family-filter input:checked')].map(i => i.value);
}

function showEmptyNotice(message) {
    stopAudio();
    document.getElementById('view-task').classList.add('hidden');
    document.getElementById('view-summary').classList.add('hidden');
    const notice = document.getElementById('empty-notice');
    notice.textContent = message;
    notice.classList.remove('hidden');
    session.tasks = [];
}

function startNewSession() {
    stopAudio();

    const level = parseInt(document.getElementById('select-level').value, 10);
    const count = parseInt(document.getElementById('select-count').value, 10);
    const families = getSelectedFamilies();

    if (families.length === 0) {
        showEmptyNotice('Bitte mindestens eine Akkordfamilie auswählen.');
        return;
    }

    const candidates = PARSED_POOL.filter(item =>
        item.level === level && item.families.every(f => families.includes(f))
    );

    if (candidates.length === 0) {
        showEmptyNotice(`Für „Stufe ${level}: ${LEVEL_LABELS[level]}“ gibt es mit den gewählten Akkordfamilien noch keine Hörbeispiele.`);
        return;
    }

    let selected = [];
    if (document.getElementById('toggle-weak').checked) {
        selected = weightedPick(candidates, count);
    } else {
        let poolCopy = shuffle(candidates);
        for (let i = 0; i < count; i++) {
            if (poolCopy.length === 0) {
                poolCopy = shuffle(candidates);
            }
            selected.push(poolCopy.pop());
        }
    }

    session = {
        level,
        families,
        total: selected.length,
        tasks: selected,
        index: 0,
        selections: [],
        evaluated: false,
        history: []
    };

    document.getElementById('empty-notice').classList.add('hidden');
    document.getElementById('view-summary').classList.add('hidden');
    document.getElementById('view-task').classList.remove('hidden');

    loadCurrentTask();
}

function loadCurrentTask() {
    stopAudio();
    const task = session.tasks[session.index];
    if (!task) return;

    session.evaluated = false;
    session.plays = 0;
    session.selections = new Array(task.chords.length).fill(null);
    updateReplayLabel();

    // Fortschritt aktualisieren
    document.getElementById('label-current-task').textContent = session.index + 1;
    document.getElementById('label-total-tasks').textContent = session.total;

    const solvedCount = session.history.filter(h => h.correct).length;
    document.getElementById('label-score-current').textContent = solvedCount;
    document.getElementById('label-score-answered').textContent = session.history.length;

    const pct = (session.index / session.total) * 100;
    document.getElementById('session-progress-bar').style.width = `${pct}%`;

    // Feedback & Buttons zurücksetzen
    const feedbackBox = document.getElementById('feedback-box');
    feedbackBox.classList.add('hidden');
    feedbackBox.innerHTML = '';

    const btnCheck = document.getElementById('btn-check');
    const btnNext = document.getElementById('btn-next');
    btnCheck.classList.remove('hidden');
    btnCheck.disabled = true;
    btnNext.classList.add('hidden');

    // Antwort-Zeilen rendern
    renderChordRows();

    // Audio-Datei vorbereiten
    prepareTaskAudio(task, document.getElementById('toggle-autoplay').checked);

    // Nächstes Hörbeispiel schon im Hintergrund laden (Cache), damit es ohne Pause startet
    const upcoming = session.tasks[session.index + 1];
    if (upcoming) {
        preloadedAudio = new Audio();
        preloadedAudio.preload = 'auto';
        preloadedAudio.src = upcoming.src;
    }
}

let preloadedAudio = null;

/* ==========================================================================
   5. ANTWORT-ZEILEN (KOMPAKTE AUSWAHL-BUTTONS, NACH FAMILIE GRUPPIERT)
   ========================================================================== */
function renderChordRows() {
    const container = document.getElementById('chord-rows-container');
    const task = session.tasks[session.index];
    if (!container || !task) return;

    container.innerHTML = '';
    const totalChords = task.chords.length;
    const visibleFamilies = CHORD_FAMILIES.filter(f => session.families.includes(f.id));
    const showHeadings = visibleFamilies.length > 1;

    task.chords.forEach((solutionCode, rowIndex) => {
        const selectedCode = session.selections[rowIndex];

        const rowEl = document.createElement('div');
        rowEl.className = 'bg-[#f8fafc] border border-slate-200 rounded-md p-4';

        const rowTitle = totalChords === 1
            ? ''
            : `<div class="text-base font-bold text-slate-800 mb-2.5">${rowIndex + 1}. Akkord:</div>`;

        const showSymbols = document.getElementById('toggle-symbols')?.checked === true;

        const groupsHtml = visibleFamilies.map(fam => {
            const buttonsHtml = CHORD_TYPES.filter(t => t.family === fam.id).map(cat => {
                let stateClass = '';

                if (!session.evaluated) {
                    if (selectedCode === cat.code) {
                        stateClass = 'is-selected';
                    }
                } else {
                    if (selectedCode === cat.code && cat.code === solutionCode) {
                        stateClass = 'eval-correct-selected';
                    } else if (selectedCode === cat.code && cat.code !== solutionCode) {
                        stateClass = 'eval-wrong-selected';
                    } else if (cat.code === solutionCode) {
                        stateClass = 'eval-missed-solution';
                    }
                }

                return `
                    <button type="button"
                        class="chord-btn ${stateClass}"
                        ${session.evaluated ? 'disabled' : ''}
                        onclick="selectChord(${rowIndex}, '${cat.code}')">
                        ${showSymbols ? cat.short : cat.label}
                        ${showSymbols ? '' : `<span class="chord-short">${cat.short}</span>`}
                    </button>
                `;
            }).join('');

            return `
                <div class="${showHeadings ? 'mt-3 first:mt-0' : ''}">
                    ${showHeadings ? `<div class="text-sm font-semibold text-slate-500 mb-1.5">${fam.label}</div>` : ''}
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        ${buttonsHtml}
                    </div>
                </div>
            `;
        }).join('');

        rowEl.innerHTML = `
            ${rowTitle}
            ${groupsHtml}
        `;

        container.appendChild(rowEl);
    });
}

function selectChord(rowIndex, chordCode) {
    if (session.evaluated) return;
    session.selections[rowIndex] = chordCode;
    renderChordRows();

    const allChosen = session.selections.every(val => val !== null);
    document.getElementById('btn-check').disabled = !allChosen;
}

/* ==========================================================================
   6. ÜBERPRÜFUNG & AUSWERTUNG
   ========================================================================== */
function checkCurrentAnswer() {
    if (session.evaluated) return;
    const task = session.tasks[session.index];
    if (!task) return;

    if (session.selections.some(val => val === null)) return;

    session.evaluated = true;

    const hits = task.chords.filter((code, idx) => session.selections[idx] === code).length;
    const isAllCorrect = hits === task.chords.length;

    session.history.push({
        task,
        userChords: [...session.selections],
        hits,
        correct: isAllCorrect
    });
    recordResult(task, session.selections);
    updateReplayLabel();

    // Fortschritt aktualisieren
    const solvedCount = session.history.filter(h => h.correct).length;
    document.getElementById('label-score-current').textContent = solvedCount;
    document.getElementById('label-score-answered').textContent = session.history.length;
    document.getElementById('session-progress-bar').style.width = `${((session.index + 1) / session.total) * 100}%`;

    renderChordRows();

    // Rückmeldung + ggf. Literaturhinweis
    const feedbackBox = document.getElementById('feedback-box');
    feedbackBox.classList.remove('hidden');

    const solutionString = task.chords.map(c => CHORD_LOOKUP[c].label).join(' → ');
    const workInfoHtml = task.title
        ? `<div class="mt-1 text-sm text-slate-700 italic">Literaturbeispiel: ${escapeHtml(task.title)}</div>`
        : '';
    const partialHtml = (!isAllCorrect && task.chords.length > 1)
        ? ` <span class="text-sm">(${hits} von ${task.chords.length} Akkorden richtig)</span>`
        : '';

    if (isAllCorrect) {
        feedbackBox.className = 'rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-950';
        feedbackBox.innerHTML = `
            <div class="font-bold">Richtig erkannt!</div>
            ${workInfoHtml}
        `;
    } else {
        feedbackBox.className = 'rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-950';
        feedbackBox.innerHTML = `
            <div><span class="font-bold">Nicht ganz richtig.</span>${partialHtml} Richtige Lösung: <span class="font-semibold">${solutionString}</span></div>
            ${workInfoHtml}
        `;
    }

    // Button umschalten
    document.getElementById('btn-check').classList.add('hidden');
    const btnNext = document.getElementById('btn-next');
    btnNext.classList.remove('hidden');
    btnNext.textContent = (session.index >= session.total - 1)
        ? 'Auswertung anzeigen'
        : 'Nächste Aufgabe';
}

function nextTask() {
    if (session.index < session.total - 1) {
        session.index++;
        loadCurrentTask();
    } else {
        showSummaryView();
    }
}

function renderSummaryStats() {
    const perType = {};
    const confusions = {};

    session.history.forEach(item => {
        item.task.chords.forEach((solution, idx) => {
            const given = item.userChords[idx];
            perType[solution] = perType[solution] || { right: 0, total: 0 };
            perType[solution].total++;
            if (given === solution) {
                perType[solution].right++;
            } else {
                const key = `${solution}>${given}`;
                confusions[key] = (confusions[key] || 0) + 1;
            }
        });
    });

    const typeRows = Object.keys(perType)
        .sort((a, b) => CHORD_TYPES.indexOf(CHORD_LOOKUP[a]) - CHORD_TYPES.indexOf(CHORD_LOOKUP[b]))
        .map(code => {
            const s = perType[code];
            const pct = Math.round((s.right / s.total) * 100);
            return `
                <li class="flex items-baseline justify-between gap-3 py-1">
                    <span>${CHORD_LOOKUP[code].label}</span>
                    <span class="tabular-nums font-semibold ${s.right === s.total ? 'text-emerald-700' : 'text-slate-800'}">${s.right} / ${s.total} (${pct} %)</span>
                </li>`;
        }).join('');

    const confusionRows = Object.entries(confusions)
        .sort((a, b) => b[1] - a[1])
        .map(([key, n]) => {
            const [solution, given] = key.split('>');
            return `
                <li class="py-1">
                    <span class="font-semibold">${CHORD_LOOKUP[solution].label}</span>
                    gehört als
                    <span class="text-red-800">${CHORD_LOOKUP[given].label}</span>
                    <span class="text-slate-500">(${n}×)</span>
                </li>`;
        }).join('');

    document.getElementById('summary-stats').innerHTML = `
        <div>
            <h3 class="text-base font-bold text-slate-800 mb-1">Trefferquote je Akkordtyp</h3>
            <ul class="divide-y divide-slate-100 text-base">${typeRows}</ul>
        </div>
        <div>
            <h3 class="text-base font-bold text-slate-800 mb-1">Verwechslungen</h3>
            ${confusionRows
                ? `<ul class="divide-y divide-slate-100 text-base">${confusionRows}</ul>`
                : '<p class="text-base text-slate-600">Keine – alle Akkorde richtig erkannt.</p>'}
        </div>
    `;
}

function showSummaryView() {
    stopAudio();
    document.getElementById('view-task').classList.add('hidden');
    document.getElementById('view-summary').classList.remove('hidden');

    const solved = session.history.filter(h => h.correct).length;
    const total = session.history.length;
    const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
    document.getElementById('summary-subtitle').textContent =
        `Sie haben ${solved} von ${total} Aufgaben richtig gelöst (${pct} %).`;

    renderSummaryStats();

    const tbody = document.getElementById('summary-table-body');
    tbody.innerHTML = '';

    session.history.forEach((item, idx) => {
        const userStr = item.userChords.map(c => CHORD_LOOKUP[c].label).join(' → ');
        const solStr = item.task.chords.map(c => CHORD_LOOKUP[c].label).join(' → ');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="py-3 px-3 text-slate-500">${idx + 1}</td>
            <td class="py-3 px-3">
                <button type="button" onclick="playSummaryAudio(${idx})"
                    class="px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-800 inline-flex items-center gap-1.5">
                    <span>▶ Anhören</span>
                </button>
            </td>
            <td class="py-3 px-3 ${item.correct ? 'text-emerald-800 font-semibold' : 'text-red-800'}">${userStr}</td>
            <td class="py-3 px-3 font-semibold text-slate-900">${solStr}</td>
            <td class="py-3 px-3 text-slate-600 italic">${item.task.title ? escapeHtml(item.task.title) : '—'}</td>
            <td class="py-3 px-3 text-right font-semibold ${item.correct ? 'text-emerald-700' : 'text-red-700'}">
                ${item.correct ? 'Richtig' : (item.task.chords.length > 1 ? `${item.hits} / ${item.task.chords.length}` : 'Falsch')}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function playSummaryAudio(historyIndex) {
    const entry = session.history[historyIndex];
    if (!entry) return;
    prepareTaskAudio(entry.task, true, false);
}

/* ==========================================================================
   7. AUDIO-PLAYER & GERÄUSCHLOSER KLAVIER-FALLBACK FÜR DIE VORSCHAU
   Lädt standardmäßig "audio/<dateiname>". Falls die lokale MP3-Datei noch
   nicht im Ordner liegt, wird im Speicher eine WAV-Audiodatei des gesamten
   Hörbeispiels erzeugt, sodass der Player nahtlos funktioniert.
   ========================================================================== */
const fallbackWavCache = {};

// Hörlimit gilt nur beim Üben, solange die aktuelle Aufgabe noch nicht ausgewertet ist
function isLimitedContext() {
    return mode === 'train' && session.tasks.length > 0 && !session.evaluated
        && !document.getElementById('view-task').classList.contains('hidden');
}

function getPlayLimit() {
    return parseInt(document.getElementById('select-limit').value, 10) || 0;
}

function limitReached() {
    const limit = getPlayLimit();
    return limit > 0 && isLimitedContext() && (session.plays || 0) >= limit;
}

// Zählt einen Start von vorn; false, wenn das Limit schon erreicht ist
function registerPlayStart() {
    if (!isLimitedContext()) return true;
    if (limitReached()) return false;
    session.plays = (session.plays || 0) + 1;
    updateReplayLabel();
    return true;
}

function updateReplayLabel() {
    const label = document.getElementById('label-replay');
    if (!label) return;
    const limit = getPlayLimit();
    if (limit === 0 || !isLimitedContext()) {
        label.textContent = 'Nochmal hören';
    } else {
        const left = Math.max(0, limit - (session.plays || 0));
        label.textContent = left > 0 ? `Nochmal hören (${left} übrig)` : 'Hörlimit erreicht';
    }
}

function applyPlaybackSpeed() {
    const v = parseFloat(document.getElementById('select-speed').value) || 1;
    audioEl.defaultPlaybackRate = v;
    audioEl.playbackRate = v;
}

function prepareTaskAudio(task, autoPlay = false, counted = true) {
    stopAudio();
    audioEl.onended = null;

    const badge = document.getElementById('badge-placeholder');
    badge.classList.add('hidden');

    if (autoPlay && counted && !registerPlayStart()) autoPlay = false;

    // Zuerst regulären relativen MP3-Pfad setzen
    audioEl.onerror = () => {
        audioEl.onerror = null;
        document.getElementById('badge-placeholder-file').textContent = task.src;
        badge.classList.remove('hidden');
        if (mode === 'compare') {
            document.getElementById('cmp-status').textContent += ' · Platzhalter-Klang';
        }
        if (!fallbackWavCache[task.filename]) {
            fallbackWavCache[task.filename] = generateProgressionWavBlobUrl(task);
        }
        audioEl.src = fallbackWavCache[task.filename];
        if (autoPlay) {
            audioEl.play().catch(() => {});
        }
    };

    audioEl.src = task.src;
    applyPlaybackSpeed();
    if (autoPlay) {
        audioEl.play().catch(() => {});
    }
}

function toggleAudioPlayback() {
    if (!audioEl.src) return;
    if (audioEl.paused) {
        const fromStart = audioEl.ended || audioEl.currentTime < 0.05;
        if (fromStart && !registerPlayStart()) return;
        audioEl.play().catch(() => {});
    } else {
        audioEl.pause();
    }
}

function replayAudioFromStart() {
    if (!audioEl.src) return;
    if (!registerPlayStart()) return;
    audioEl.currentTime = 0;
    audioEl.play().catch(() => {});
}

function stopAudio() {
    audioEl.pause();
    audioEl.currentTime = 0;
    updateAudioPlayerUI();
}

function seekAudio(event) {
    if (!audioEl.duration || limitReached()) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    audioEl.currentTime = ratio * audioEl.duration;
}

function formatSeconds(sec) {
    if (!isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function updateAudioPlayerUI() {
    const isPlaying = !audioEl.paused && !audioEl.ended;
    document.getElementById('icon-audio-play').classList.toggle('hidden', isPlaying);
    document.getElementById('icon-audio-pause').classList.toggle('hidden', !isPlaying);

    const dur = audioEl.duration || 0;
    const cur = audioEl.currentTime || 0;
    const pct = dur > 0 ? Math.min(100, (cur / dur) * 100) : 0;

    document.getElementById('audio-seek-fill').style.width = `${pct}%`;
    document.getElementById('audio-time-display').textContent = `${formatSeconds(cur)} / ${formatSeconds(dur)}`;
}

audioEl.addEventListener('play', updateAudioPlayerUI);
audioEl.addEventListener('pause', updateAudioPlayerUI);
audioEl.addEventListener('ended', updateAudioPlayerUI);
audioEl.addEventListener('timeupdate', updateAudioPlayerUI);
audioEl.addEventListener('loadedmetadata', updateAudioPlayerUI);

// Erzeugt bei fehlender MP3-Datei im Hintergrund einen weichen Klavierklang als WAV-Blob
function generateProgressionWavBlobUrl(task) {
    const sampleRate = 22050;
    const chordDuration = 1.8;
    const totalDuration = task.chords.length * chordDuration + 0.4;
    const numSamples = Math.floor(sampleRate * totalDuration);
    const samples = new Float32Array(numSamples);

    const seed = task.seed || 1;
    const bassNotes = [48, 50, 53, 55, 52, 49];

    task.chords.forEach((chordCode, chordIdx) => {
        const cat = CHORD_LOOKUP[chordCode];
        if (!cat) return;

        const rootMidi = bassNotes[(seed + chordIdx * 2) % bassNotes.length];
        // Grundton als Bass, alle übrigen Töne eine Oktave höher (beliebig viele Stimmen)
        const midiNotes = [
            rootMidi,
            ...cat.intervals.slice(1).map(iv => rootMidi + 12 + iv)
        ];
        const voiceGain = 4 / midiNotes.length;

        const startSample = Math.floor(chordIdx * chordDuration * sampleRate);
        const chordSamples = Math.floor((chordDuration + 0.25) * sampleRate);

        midiNotes.forEach((midi, voiceIdx) => {
            const freq = 440 * Math.pow(2, (midi - 69) / 12);
            const voiceOffset = voiceIdx * Math.floor(0.012 * sampleRate);

            for (let i = 0; i < chordSamples; i++) {
                const idx = startSample + voiceOffset + i;
                if (idx >= numSamples) break;

                const t = i / sampleRate;
                const attack = Math.min(1, t / 0.02);
                const decay = Math.exp(-t * 1.65);
                const env = attack * decay * 0.14 * voiceGain;

                // Warmer Klavier-Obertonklang
                const wave =
                    Math.sin(2 * Math.PI * freq * t) +
                    0.35 * Math.sin(4 * Math.PI * freq * t) * Math.exp(-t * 2.5) +
                    0.12 * Math.sin(6 * Math.PI * freq * t) * Math.exp(-t * 4.0);

                samples[idx] += wave * env;
            }
        });
    });

    // Float32 in 16-Bit PCM WAV umwandeln
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeStr = (offset, str) => {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
        const clamped = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF, true);
        offset += 2;
    }

    return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

/* ==========================================================================
   8. TASTATURSTEUERUNG & INITIALISIERUNG
   ========================================================================== */
window.addEventListener('keydown', (e) => {
    if (mode !== 'train' || document.getElementById('view-task').classList.contains('hidden')) return;
    // Bedienelemente (Auswahlfelder, Checkboxen) behalten ihre eigene Tastatursteuerung
    if (e.target && ['SELECT', 'INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

    if (e.code === 'Space') {
        e.preventDefault();
        toggleAudioPlayback();
    } else if (e.code === 'Enter') {
        e.preventDefault();
        if (!session.evaluated) {
            const btnCheck = document.getElementById('btn-check');
            if (!btnCheck.disabled) checkCurrentAnswer();
        } else {
            nextTask();
        }
    }
});

window.onload = function () {
    renderFamilyFilter();
    renderCompareOptions();
    updateCompareInfo();
    startNewSession();
};
