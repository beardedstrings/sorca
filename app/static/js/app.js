/* ── ORCA Frontend Logic ─────────────────────────────── */

/* ── State ───────────────────────────────────────────── */
const state = {
    currentAction: null,
    currentCase:   null,
    links:         [],
    settingsOpen:  false,
};

/* ── Init ────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
    startClocks();
    loadStoredLinks();
    loadStoredIdentity();
    loadStoredAccent();
    loadStoredPanelWidths();
    initResizeHandles();
});

/* ── Clocks ──────────────────────────────────────────── */
function startClocks() {
    const fmtOpts = { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false };
    // America/New_York follows DST automatically (EST in winter, EDT in summer).
    const estFmt   = new Intl.DateTimeFormat('en-US', { ...fmtOpts, timeZone: 'America/New_York' });
    const localFmt = new Intl.DateTimeFormat('en-US', fmtOpts);

    function tick() {
        const now = new Date();
        document.getElementById('clock-est').textContent   = estFmt.format(now);
        document.getElementById('clock-local').textContent = localFmt.format(now);
    }
    tick();
    setInterval(tick, 1000);
}

/* ── Tab Switching ───────────────────────────────────── */
function switchTab(name, btn) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + name).classList.add('active');
}

/* ── Tool Selection ──────────────────────────────────── */
function selectTool(btn) {
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    state.currentAction = btn.dataset.action;
    const label = btn.dataset.label;
    const hint  = btn.dataset.hint;

    const ws = document.getElementById('tool-workspace');
    ws.innerHTML = `
        <div class="tool-header">
            <span class="tool-title">${label}</span>
        </div>
        <div class="tool-hint">${hint}</div>
        <div>
            <label class="target-label">TARGET</label>
            <input type="text" id="target-input" class="target-input"
                placeholder="Enter value..."
                onkeydown="if(event.key==='Enter') runAction()"/>
        </div>
        <button class="run-btn" id="run-btn" onclick="runAction()">▶ RUN</button>
        <div>
            <label class="results-label">RESPONSE</label>
            <div class="results-box empty" id="results-box">Awaiting input...</div>
        </div>
    `;

    document.getElementById('target-input').focus();
    addLog(`selected · ${label}`);
}

/* ── Run Action ──────────────────────────────────────── */
async function runAction() {
    if (!state.currentAction) return;

    const target = document.getElementById('target-input')?.value.trim();
    const caseId = document.getElementById('case-id')?.value.trim();
    const email  = localStorage.getItem('orca-email') || '';
    const token  = localStorage.getItem('orca-token') || '';
    const box    = document.getElementById('results-box');
    const btn    = document.getElementById('run-btn');

    if (!target) { setResult(box, 'error', '⚠ No target entered.'); return; }

    btn.disabled = true;
    setResult(box, 'waiting', `⟳  Running ${state.currentAction} on "${target}"...`);
    addLog(`run · ${state.currentAction} → ${target}`, 'action');

    try {
        const resp = await fetch(`/actions/${state.currentAction}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target, case_id: caseId || '', email, token }),
        });
        const data = await resp.json();

        if (data.error) {
            setResult(box, 'error', `✖ Error: ${data.error}`);
            addLog(`error · ${state.currentAction}`, 'error');
        } else {
            setResult(box, '', JSON.stringify(data, null, 2));
            addLog(`done · ${state.currentAction}`, 'success');
        }
    } catch (err) {
        setResult(box, 'error', `✖ Request failed: ${err.message}`);
        addLog(`error · ${err.message}`, 'error');
    } finally {
        btn.disabled = false;
    }
}

/* ── Load Case ───────────────────────────────────────── */
async function loadCase() {
    const caseId  = document.getElementById('case-id')?.value.trim();
    const badge   = document.getElementById('case-status');
    const details = document.getElementById('case-details');
    const ciLabel = document.getElementById('ci-label');
    const ciDot   = document.getElementById('ci-dot');

    if (!caseId) {
        ciLabel.textContent = 'No Case Loaded';
        ciLabel.classList.remove('active');
        ciDot.classList.remove('active');
        badge.textContent = 'No Case';
        badge.classList.remove('loaded');
        details.innerHTML = '<div class="case-empty">Load a case to see details here.</div>';
        renderCaseTab(null);
        state.currentCase = null;
        return;
    }

    addLog(`loading case · ${caseId}`, 'action');

    // Update topbar indicator
    ciLabel.textContent = caseId.toUpperCase();
    ciLabel.classList.add('active');
    ciDot.classList.add('active');
    badge.textContent = caseId.toUpperCase();
    badge.classList.add('loaded');

    // Right panel summary (placeholder until ServiceNow wired)
    details.innerHTML = `
        <div class="case-field">
            <span class="case-field-label">Case ID</span>
            <span class="case-field-value mono">${caseId.toUpperCase()}</span>
        </div>
        <div class="case-field">
            <span class="case-field-label">Status</span>
            <span class="case-field-value">In Progress</span>
        </div>
        <div class="case-field">
            <span class="case-field-label">Priority</span>
            <span class="priority high">HIGH</span>
        </div>
        <div class="case-field">
            <span class="case-field-label">Assigned To</span>
            <span class="case-field-value">SOC Analyst</span>
        </div>
    `;

    state.currentCase = caseId;

    // Populate Cases tab in background
    renderCaseTab({
        id: caseId.toUpperCase(),
        status: 'In Progress',
        priority: 'HIGH',
        assignedTo: 'SOC Analyst',
        shortDescription: 'Placeholder — ServiceNow integration pending',
        description: 'Full description will populate here once ServiceNow integration is connected. This area supports multi-line content and scrolls when the text is long.',
        openedAt: new Date().toLocaleString(),
    });

    addLog(`case loaded · ${caseId}`, 'success');
}

function renderCaseTab(caseData) {
    const view = document.getElementById('case-view');
    if (!caseData) {
        view.innerHTML = `<div class="tool-placeholder">
            <div class="placeholder-icon">◎</div>
            <p>No case loaded. Enter a case ID in the left panel.</p>
        </div>`;
        return;
    }

    const priorityClass = (caseData.priority || '').toLowerCase();

    view.innerHTML = `
        <div class="case-tab-header">
            <span class="case-tab-title">${caseData.id}</span>
            <span class="priority ${priorityClass}">${caseData.priority}</span>
        </div>

        <div class="case-fields-grid">
            <div class="case-field-card">
                <span class="cf-label">Status</span>
                <span class="cf-value">${caseData.status}</span>
            </div>
            <div class="case-field-card">
                <span class="cf-label">Assigned To</span>
                <span class="cf-value">${caseData.assignedTo}</span>
            </div>
            <div class="case-field-card">
                <span class="cf-label">Opened At</span>
                <span class="cf-value mono">${caseData.openedAt}</span>
            </div>
            <div class="case-field-card">
                <span class="cf-label">Short Description</span>
                <span class="cf-value">${caseData.shortDescription}</span>
            </div>
        </div>

        <div class="case-desc-card">
            <span class="cf-label" style="margin-bottom:8px;display:block;">Description</span>
            <div class="case-desc-body">${caseData.description}</div>
        </div>

        <div class="update-case-section">
            <span class="update-case-label">Update Case · Add Work Note</span>
            <textarea id="update-case-text" class="update-case-input"
                placeholder="Enter your work note here..."></textarea>
            <button class="run-btn" style="align-self:flex-start;" onclick="updateCase()">▶ Submit Update</button>
            <div class="results-label" style="margin-top:4px;"></div>
            <div class="results-box empty" id="update-results" style="min-height:60px;max-height:120px;">
                Ready to submit.
            </div>
        </div>
    `;
}

async function updateCase() {
    const note   = document.getElementById('update-case-text')?.value.trim();
    const caseId = state.currentCase;
    const box    = document.getElementById('update-results');
    const email  = localStorage.getItem('orca-email') || '';
    const token  = localStorage.getItem('orca-token') || '';

    if (!caseId) { setResult(box, 'error', '⚠ No case loaded.'); return; }
    if (!note)   { setResult(box, 'error', '⚠ Note is empty.'); return; }

    setResult(box, 'waiting', '⟳  Submitting update...');
    addLog(`update case · ${caseId}`, 'action');

    try {
        const resp = await fetch('/actions/update_ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target: note, case_id: caseId, email, token }),
        });
        const data = await resp.json();
        if (data.error) {
            setResult(box, 'error', `✖ ${data.error}`);
            addLog('update failed', 'error');
        } else {
            setResult(box, '', '✔ Case updated successfully.');
            document.getElementById('update-case-text').value = '';
            addLog(`case updated · ${caseId}`, 'success');
        }
    } catch (err) {
        setResult(box, 'error', `✖ ${err.message}`);
    }
}

/* ── Settings ────────────────────────────────────────── */
function toggleSettings() {
    state.settingsOpen = !state.settingsOpen;
    const toolsView    = document.getElementById('left-tools-view');
    const settingsView = document.getElementById('left-settings-view');
    const toggle       = document.getElementById('settings-toggle');
    const label        = document.getElementById('left-panel-label');

    if (state.settingsOpen) {
        toolsView.style.display    = 'none';
        settingsView.style.display = 'block';
        toggle.classList.add('active');
        label.textContent = 'Settings';
    } else {
        toolsView.style.display    = 'block';
        settingsView.style.display = 'none';
        toggle.classList.remove('active');
        label.textContent = 'Tools';
    }
}

function saveIdentity() {
    const email = document.getElementById('settings-email').value.trim();
    const token = document.getElementById('settings-token').value.trim();
    localStorage.setItem('orca-email', email);
    localStorage.setItem('orca-token', token);
    const msg = document.getElementById('identity-saved');
    msg.textContent = '✔ Saved';
    setTimeout(() => { msg.textContent = ''; }, 2500);
    addLog('identity saved', 'success');
}

function loadStoredIdentity() {
    const email = localStorage.getItem('orca-email') || '';
    const token = localStorage.getItem('orca-token') || '';
    const eEl = document.getElementById('settings-email');
    const tEl = document.getElementById('settings-token');
    if (eEl) eEl.value = email;
    if (tEl) tEl.value = token;
}

function setAccent(color) {
    document.documentElement.style.setProperty('--accent', color);
    // Update dim and glow too
    document.documentElement.style.setProperty('--accent-dim',  hexToRgba(color, 0.12));
    document.documentElement.style.setProperty('--accent-glow', hexToRgba(color, 0.07));
    localStorage.setItem('orca-accent', color);
    const picker = document.getElementById('accent-picker');
    if (picker) picker.value = color;
}

function loadStoredAccent() {
    const accent = localStorage.getItem('orca-accent');
    if (accent) setAccent(accent);
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function resetPanels() {
    document.getElementById('left-panel').style.width  = '220px';
    document.getElementById('right-panel').style.width = '270px';
    localStorage.removeItem('orca-left-w');
    localStorage.removeItem('orca-right-w');
    addLog('panel widths reset');
}

/* ── Font Size ───────────────────────────────────────── */
function adjustFont(side, delta) {
    const panel = document.getElementById(side === 'left' ? 'left-panel' : 'right-panel');
    const prop  = side === 'left' ? '--left-font' : '--right-font';
    const current = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(prop)) || 13;
    const next = Math.min(20, Math.max(9, current + delta));
    document.documentElement.style.setProperty(prop, next + 'px');
    localStorage.setItem('orca-' + side + '-font', next);
}

/* ── Resize Handles ──────────────────────────────────── */
function initResizeHandles() {
    makeResizable('left-resize',  'left-panel',  'right', 'orca-left-w');
    makeResizable('right-resize', 'right-panel', 'left',  'orca-right-w');
}

function makeResizable(handleId, panelId, direction, storageKey) {
    const handle = document.getElementById(handleId);
    const panel  = document.getElementById(panelId);
    if (!handle || !panel) return;

    let startX, startW;

    handle.addEventListener('mousedown', e => {
        startX = e.clientX;
        startW = panel.getBoundingClientRect().width;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        function onMove(e) {
            const dx = direction === 'right' ? e.clientX - startX : startX - e.clientX;
            const newW = Math.min(420, Math.max(160, startW + dx));
            panel.style.width = newW + 'px';
        }
        function onUp() {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            localStorage.setItem(storageKey, panel.style.width);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
}

function loadStoredPanelWidths() {
    const lw = localStorage.getItem('orca-left-w');
    const rw = localStorage.getItem('orca-right-w');
    if (lw) document.getElementById('left-panel').style.width  = lw;
    if (rw) document.getElementById('right-panel').style.width = rw;

    const lf = localStorage.getItem('orca-left-font');
    const rf = localStorage.getItem('orca-right-font');
    if (lf) document.documentElement.style.setProperty('--left-font',  lf + 'px');
    if (rf) document.documentElement.style.setProperty('--right-font', rf + 'px');
}

/* ── Links ───────────────────────────────────────────── */
function loadStoredLinks() {
    try {
        const stored = localStorage.getItem('orca-links');
        state.links = stored ? JSON.parse(stored) : [];
    } catch { state.links = []; }
    renderLinks();
}

function saveLinks() {
    localStorage.setItem('orca-links', JSON.stringify(state.links));
}

function showAddLink() {
    document.getElementById('add-link-form').style.display = 'flex';
    document.getElementById('new-link-name').focus();
}

function hideAddLink() {
    document.getElementById('add-link-form').style.display = 'none';
    document.getElementById('new-link-name').value = '';
    document.getElementById('new-link-url').value  = '';
    document.getElementById('new-link-note').value = '';
}

function addLink() {
    const name = document.getElementById('new-link-name').value.trim();
    const url  = document.getElementById('new-link-url').value.trim();
    const note = document.getElementById('new-link-note').value.trim();

    if (!name || !url) { alert('Name and URL are required.'); return; }

    state.links.push({ name, url, note, id: Date.now() });
    saveLinks();
    renderLinks();
    hideAddLink();
    addLog(`link added · ${name}`, 'success');
}

function removeLink(id) {
    state.links = state.links.filter(l => l.id !== id);
    saveLinks();
    renderLinks();
    addLog('link removed');
}

function renderLinks() {
    const grid = document.getElementById('links-grid');
    if (!grid) return;

    if (state.links.length === 0) {
        grid.innerHTML = `<div class="tool-placeholder" style="grid-column:1/-1;">
            <div class="placeholder-icon">⬡</div>
            <p>No links yet. Add one or import a file.</p>
        </div>`;
        return;
    }

    grid.innerHTML = state.links.map(l => `
        <div class="link-card">
            <div class="link-card-top">
                <a class="link-name" href="${escHtml(l.url)}" target="_blank" rel="noopener">${escHtml(l.name)}</a>
                <button class="link-remove" onclick="removeLink(${l.id})" title="Remove">✕</button>
            </div>
            <div class="link-url">${escHtml(l.url)}</div>
            ${l.note ? `<div class="link-note">${escHtml(l.note)}</div>` : ''}
        </div>
    `).join('');
}

function importLinks(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const text = e.target.result;
        let imported = 0;
        // Support simple line-by-line: URL or "Name | URL | Note"
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        lines.forEach(line => {
            if (line.startsWith('#')) return; // skip comments
            const parts = line.split('|').map(p => p.trim());
            const url  = parts.find(p => p.startsWith('http')) || parts[0];
            const name = parts[0].startsWith('http') ? url : parts[0];
            const note = parts[2] || '';
            if (url) {
                state.links.push({ name: name || url, url, note, id: Date.now() + imported });
                imported++;
            }
        });
        saveLinks();
        renderLinks();
        addLog(`imported ${imported} link(s)`, 'success');
        event.target.value = '';
    };
    reader.readAsText(file);
}

/* ── Tines Stories ───────────────────────────────────── */
async function fetchStories() {
    const container = document.getElementById('stories-container');
    const email = localStorage.getItem('orca-email') || '';
    const token = localStorage.getItem('orca-token') || '';
    container.innerHTML = `<div class="tool-placeholder"><div class="placeholder-icon" style="animation:spin 1.5s linear infinite;">◎</div><p>Fetching from Tines...</p></div>`;
    addLog('fetching Tines stories...', 'action');

    try {
        const resp = await fetch('/actions/stories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target: 'fetch', email, token }),
        });
        const data = await resp.json();

        if (data.error || !data.categories) {
            container.innerHTML = `<div class="tool-placeholder"><p style="color:var(--danger)">✖ ${data.error || 'Invalid response from Tines.'}</p></div>`;
            addLog('stories fetch failed', 'error');
            return;
        }

        renderStories(data.categories);
        addLog(`loaded ${data.categories.length} categorie(s)`, 'success');
    } catch (err) {
        container.innerHTML = `<div class="tool-placeholder"><p style="color:var(--danger)">✖ ${err.message}</p></div>`;
        addLog('stories fetch error', 'error');
    }
}

function renderStories(categories) {
    const container = document.getElementById('stories-container');
    if (!categories || categories.length === 0) {
        container.innerHTML = `<div class="tool-placeholder"><p>No categories found in response.</p></div>`;
        return;
    }

    container.innerHTML = categories.map(cat => `
        <div class="story-category">
            <div class="story-category-title">${escHtml(cat.name)}</div>
            <div class="story-cards">
                ${(cat.stories || []).map(s => `
                    <div class="story-card">
                        <div class="story-card-name">${escHtml(s.name)}</div>
                        ${s.description ? `<div class="story-card-desc">${escHtml(s.description)}</div>` : ''}
                        <a class="story-card-link" href="${escHtml(s.url)}" target="_blank" rel="noopener">Open in Tines →</a>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

/* ── Helpers ─────────────────────────────────────────── */
function setResult(box, state, text) {
    if (!box) return;
    box.className = 'results-box' + (state ? ' ' + state : '');
    box.textContent = text;
}

function addLog(message, type = '') {
    const log = document.getElementById('activity-log');
    if (!log) return;
    const now = new Date().toLocaleTimeString('en-US', { hour12: false });
    const entry = document.createElement('div');
    entry.className = 'log-entry' + (type ? ' ' + type : '');
    entry.textContent = `${now}  ${message}`;
    log.insertBefore(entry, log.firstChild);
    while (log.children.length > 50) log.removeChild(log.lastChild);
}

function escHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
}

/* CSS spin for loading */
const styleEl = document.createElement('style');
styleEl.textContent = `@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`;
document.head.appendChild(styleEl);
