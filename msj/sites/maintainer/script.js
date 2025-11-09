// DOM Elements
const calendarEl = document.getElementById('calendar');
const currentValueEl = document.getElementById('current-value');
const daysElapsedEl = document.getElementById('days-elapsed');
const nextDayValueEl = document.getElementById('next-day-value');
const nextDayAmountEl = document.getElementById('next-day-amount');
// Sidebar / views
const navCalculator = document.getElementById('nav-calculator');
const navHistory = document.getElementById('nav-history');
const navSettings = document.getElementById('nav-settings');
const viewCalculator = document.getElementById('view-calculator');
const viewHistory = document.getElementById('view-history');
const historySavingsContainer = document.getElementById('history-savings-container');
const currentSavingsCard = document.getElementById('current-savings-card');
// Settings (simplified)
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const settingsClose = document.getElementById('settings-close');
const settingsBackdrop = document.getElementById('settings-close-backdrop');
const simplePrimary = document.getElementById('simple-primary');
const simpleSecondary = document.getElementById('simple-secondary');
const simpleBg = document.getElementById('simple-bg');
const simpleText = document.getElementById('simple-text');
const settingsSave = document.getElementById('settings-save');
const settingsReset = document.getElementById('settings-reset');

// Constants
let INITIAL_AMOUNT = 100; // initial investment
let DAILY_INTEREST_RATE = 0.05; // as a decimal fraction per day
let TOTAL_DAYS = 80; // number of investment days (business or calendar depending on toggle)
let START_DATE = new Date(); // default to today, can be overridden via calculator
let INCLUDE_WEEKENDS = true; // whether to include weekends in the schedule
let SELECTED_DAYS = [0, 1, 2, 3, 4, 5, 6]; // which days of week to include (0=Sun, 6=Sat)
let REINVEST_PERCENT = 1; // 1 for 100%
let CONTRIBUTION = { type: 'none', amount: 0, frequency: 'weekly' };
let CURRENCY = { code: 'USD', symbol: '$' };

// State
let investmentData = [];
let calcHistory = [];
let historySearchQuery = '';

// Main application code
let currentProgress = {
    amount: 0,
    day: 0,
    isSet: false,
    dailyRate: 0.05 // Default 5% daily rate
};

// Server storage helpers
const API_URL = 'api/storage.php';

async function storageGet(key, defaultValue) {
    try {
        const res = await fetch(`${API_URL}?key=${encodeURIComponent(key)}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            cache: 'no-store'
        });
        if (!res.ok) throw new Error(`GET ${key} failed: ${res.status}`);
        const data = await res.json();
        return (data === null || data === undefined) ? defaultValue : data;
    } catch (e) {
        console.warn('storageGet error for', key, e);
        return defaultValue;
    }
}

function getThemeFromInputs() {
    const primary = simplePrimary?.value || '#E0569A';
    const secondary = simpleSecondary?.value || '#FFB0B8';
    const bg = simpleBg?.value || '#2D155A';
    const text = simpleText?.value || '#FCE7F3';
    return deriveVarsFromSimple({ primary, secondary, bg, text });
}

function deriveVarsFromSimple({ primary, secondary, bg, text }) {
    // Simple derived palette keeping existing CSS expectations
    const vars = {
        version: 'simple-v1',
        primary,
        primaryDark: primary,
        secondary,
        success: '#34d399',
        info: '#c4b5fd',
        warning: '#fbbf24',
        danger: '#ef4444',
        light: '#fde7f3',
        dark: bg,
        bg,
        cardBg: bg,
        cardHover: bg,
        text,
        textMuted: '#D8B4E2',
        border: '#ffffff1f',
        glassBg: 'rgba(45,21,90,0.72)',
        glassBorder: '#ffffff1f',
        sidebarBgHex: secondary,
        calendarBgHex: bg,
        headingMode: 'static',
        headingColor1: text,
        headingColor2: primary,
        miniHeadingMode: 'gradient',
        miniHeadingColor1: secondary,
        miniHeadingColor2: primary,
        themeMode: 'gradient',
        themeColor1: primary,
        themeColor2: secondary,
        commonText: text
    };
    // Derived CSS strings
    vars.headingFill = `linear-gradient(0deg, ${vars.headingColor1}, ${vars.headingColor1})`;
    vars.miniHeadingFill = `linear-gradient(90deg, ${vars.miniHeadingColor1}, ${vars.miniHeadingColor2})`;
    vars.themeFill = `linear-gradient(135deg, ${vars.themeColor1}, ${vars.themeColor2})`;
    vars.sidebarBg = `linear-gradient(180deg, ${hexToRgba(primary,0.12)}, ${hexToRgba(secondary,0.08)} 60%, ${vars.sidebarBgHex})`;
    vars.calendarBg = vars.bg;
    return vars;
}

function hexToRgba(hex, a) {
    const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '000000');
    if (!res) return `rgba(0,0,0,${a})`;
    const r = parseInt(res[1],16), g = parseInt(res[2],16), b = parseInt(res[3],16);
    return `rgba(${r},${g},${b},${a})`;
}

async function storageSet(key, value) {
    try {
        const res = await fetch(`${API_URL}?key=${encodeURIComponent(key)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(value)
        });
        if (!res.ok) throw new Error(`POST ${key} failed: ${res.status}`);
        return true;
    } catch (e) {
        console.warn('storageSet error for', key, e);
        return false;
    }
}

// Parse URL parameters
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        amount: parseFloat(params.get('amount')) || 0,
        dailyRate: parseFloat(params.get('dailyRate')) || 0.05
    };
}

// Capture current calculator parameters
function getCalculatorParams() {
    const currencyBtn = document.querySelector('#currency-group .segment.active');
    const includeWeekends = document.querySelector('#weekends-toggle .segment.active')?.dataset.include !== 'false';
    
    // Get selected days from checkboxes
    const selectedDays = [];
    document.querySelectorAll('.day-checkbox:checked').forEach(cb => {
        selectedDays.push(parseInt(cb.dataset.day));
    });
    
    return {
        currency: { code: currencyBtn?.dataset.code || CURRENCY.code, symbol: currencyBtn?.dataset.symbol || CURRENCY.symbol },
        initial: parseFloat(document.getElementById('initial-amount').value) || 0,
        rateValue: parseFloat(document.getElementById('annual-rate').value) || 0,
        ratePeriod: (document.getElementById('rate-period') || { value: 'per_day' }).value,
        years: parseInt(document.getElementById('years').value || '0', 10),
        months: parseInt(document.getElementById('months').value || '0', 10),
        days: parseInt(document.getElementById('days').value || '0', 10),
        includeWeekends: includeWeekends,
        selectedDays: selectedDays,
        reinvest: parseFloat((document.getElementById('reinvest') || { value: '1' }).value) || 1,
        contrib: {
            type: document.querySelector('#contrib-type .segment.active')?.dataset.type || 'none',
            amount: parseFloat(document.getElementById('contrib-amount')?.value || '0') || 0,
            frequency: (document.getElementById('contrib-frequency') || { value: 'weekly' }).value
        },
        startDate: document.getElementById('start-date')?.value || ''
    };
}

function setCalculatorParams(p) {
    if (!p) return;
    // Currency
    document.querySelectorAll('#currency-group .segment').forEach(b => {
        b.classList.toggle('active', b.dataset.code === p.currency.code);
    });
    CURRENCY = { code: p.currency.code, symbol: p.currency.symbol };
    document.querySelectorAll('.input-prefix').forEach(el => el.textContent = CURRENCY.symbol);

    // Basics
    document.getElementById('initial-amount').value = p.initial;
    document.getElementById('annual-rate').value = p.rateValue;
    document.getElementById('rate-period').value = p.ratePeriod;
    document.getElementById('years').value = p.years;
    document.getElementById('months').value = p.months;
    document.getElementById('days').value = p.days;
    document.getElementById('reinvest').value = String(p.reinvest);

    // Weekends
    document.querySelectorAll('#weekends-toggle .segment').forEach(b => b.classList.remove('active'));
    const wkBtn = document.querySelector(`#weekends-toggle .segment[data-include="${p.includeWeekends ? 'true' : 'false'}"]`);
    if (wkBtn) wkBtn.classList.add('active');
    INCLUDE_WEEKENDS = p.includeWeekends;
    
    // Show/hide day selector
    const daySelector = document.getElementById('day-selector');
    if (daySelector) {
        daySelector.style.display = p.includeWeekends ? 'none' : 'block';
    }
    
    // Restore selected days
    if (p.selectedDays && Array.isArray(p.selectedDays)) {
        SELECTED_DAYS = [...p.selectedDays];
        // Update checkboxes
        document.querySelectorAll('.day-checkbox').forEach(cb => {
            cb.checked = p.selectedDays.includes(parseInt(cb.dataset.day));
        });
    }

    // Contributions
    document.querySelectorAll('#contrib-type .segment').forEach(b => {
        b.classList.toggle('active', b.dataset.type === p.contrib.type);
    });
    const show = p.contrib.type !== 'none';
    const fields = document.getElementById('contrib-fields');
    if (fields) fields.style.display = show ? 'block' : 'none';
    if (document.getElementById('contrib-amount')) document.getElementById('contrib-amount').value = p.contrib.amount;
    if (document.getElementById('contrib-frequency')) document.getElementById('contrib-frequency').value = p.contrib.frequency;

    // Start date
    if (p.startDate && document.getElementById('start-date')) document.getElementById('start-date').value = p.startDate;
}

function addHistoryEntry() {
    const p = getCalculatorParams();
    const now = new Date();
    const entry = {
        id: now.getTime(),
        createdAt: now.toISOString(),
        params: p,
        title: `${p.currency.code} ${p.initial} @ ${p.rateValue}% ${p.ratePeriod.replace('per_','/')} • ${p.years}y ${p.months}m ${p.days}d`
    };
    calcHistory.unshift(entry);
    calcHistory = calcHistory.slice(0, 50);
    persistHistory();
    renderHistory();
}

function renderHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;
    list.innerHTML = '';
    const q = (historySearchQuery || '').trim().toLowerCase();
    const filtered = calcHistory.filter(item => {
        if (!q) return true;
        const hay = `${item.title} ${item.params?.currency?.code || ''} ${item.params?.currency?.symbol || ''} ${item.createdAt}`.toLowerCase();
        return hay.includes(q);
    });
    if (!filtered.length) {
        const empty = document.createElement('div');
        empty.className = 'history-item-sub';
        empty.textContent = q ? 'No results for your search.' : 'No history yet. Run a calculation to save it here.';
        list.appendChild(empty);
        renderHistoryPreview(null);
        return;
    }
    filtered.forEach(item => {
        const row = document.createElement('div');
        row.className = 'history-item';
        row.dataset.id = String(item.id);
        row.innerHTML = `
            <div class="info">
                <div class="history-item-title">${item.title}</div>
                <div class="history-item-sub">${new Date(item.createdAt).toLocaleString()}</div>
            </div>
            <div class="actions">
                <button class="btn btn-danger" data-action="delete" type="button" title="Delete">Delete</button>
                <button class="btn btn-primary" data-action="load" type="button" title="Load">Load</button>
            </div>
        `;
        // Row click selects/preview (but ignore button clicks)
        row.addEventListener('click', (e) => {
            if (e.target.closest('.actions')) return; // skip if action button
            selectHistoryRow(row.dataset.id);
            renderHistoryPreview(item);
        });
        // Load action
        row.querySelector('[data-action="load"]').addEventListener('click', () => {
            setCalculatorParams(item.params);
            updateCalculatorResults();
            mountSavingsToHistory();
            selectHistoryRow(row.dataset.id);
            renderHistoryPreview(item);
        });
        // Delete action
        row.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteHistoryItem(item.id);
        });
        list.appendChild(row);
    });
}

function selectHistoryRow(id) {
    document.querySelectorAll('.history-item').forEach(el => el.classList.toggle('selected', el.dataset.id === String(id)));
}

function renderHistoryPreview(item) {
    const pane = document.getElementById('history-preview-body');
    if (!pane) return;
    if (!item) { pane.innerHTML = '<div class="history-empty">Select an item from the list to see details.</div>'; return; }
    const p = item.params || {};
    
    // Format selected days for display
    let daysDisplay = 'All days';
    if (!p.includeWeekends && p.selectedDays && p.selectedDays.length > 0) {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        daysDisplay = p.selectedDays.map(d => dayNames[d]).join(', ');
    }
    
    pane.innerHTML = `
        <div class="kv-grid">
          <div class="kv">
            <div class="label">Created</div><div>${new Date(item.createdAt).toLocaleString()}</div>
            <div class="label">Currency</div><div>${p.currency?.code || ''} ${p.currency?.symbol || ''}</div>
            <div class="label">Principal</div><div>${p.initial}</div>
            <div class="label">Rate</div><div>${p.rateValue}% ${p.ratePeriod?.replace('per_','/')}</div>
          </div>
          <div class="kv">
            <div class="label">Duration</div><div>${p.years}y ${p.months}m ${p.days}d</div>
            <div class="label">Days</div><div>${daysDisplay}</div>
            <div class="label">Reinvest</div><div>${Math.round(((p.reinvest ?? 1) * 100))}%</div>
            <div class="label">Contrib</div><div>${p.contrib?.type || 'none'} ${p.contrib?.amount || 0} ${p.contrib?.frequency || ''}</div>
          </div>
        </div>
        <div class="preview-actions">
          <button id="hist-load-now" class="btn-primary" type="button" style="width:auto;padding:.5rem .9rem;">Load to Calculator</button>
        </div>
    `;
    const btn = document.getElementById('hist-load-now');
    if (btn) btn.addEventListener('click', () => {
        setCalculatorParams(item.params);
        updateCalculatorResults();
        switchView('calculator');
    });
}

function deleteHistoryItem(id) {
    const before = calcHistory.length;
    calcHistory = calcHistory.filter(x => String(x.id) !== String(id));
    persistHistory();
    // If the deleted item was selected, clear preview
    const selected = document.querySelector(`.history-item.selected`);
    if (selected && selected.dataset.id === String(id)) {
        renderHistoryPreview(null);
    }
    renderHistory();
}

// Move current savings card between views
function mountSavingsToHistory() {
    if (!currentSavingsCard || !historySavingsContainer) return;
    historySavingsContainer.appendChild(currentSavingsCard);
}
function mountSavingsToCalculator() {
    if (!currentSavingsCard) return;
    const target = document.querySelector('#view-calculator .dashboard .dashboard-column:last-child');
    if (target) target.appendChild(currentSavingsCard);
}

function switchView(name) {
    if (name === 'history') {
        viewHistory.hidden = false; viewCalculator.hidden = true;
        navHistory.classList.add('active'); navCalculator.classList.remove('active');
        mountSavingsToHistory();
        renderHistory();
    } else {
        viewHistory.hidden = true; viewCalculator.hidden = false;
        navCalculator.classList.add('active'); navHistory.classList.remove('active');
        mountSavingsToCalculator();
    }
}

// Utility: set start-date input default to today (local)
function setDefaultStartDate() {
    const input = document.getElementById('start-date');
    if (!input) return;
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    input.value = `${y}-${m}-${d}`;
}

// Load saved progress from server JSON
async function loadProgress() {
    const progress = await storageGet('savingsProgress', null);
    if (progress && typeof progress === 'object') {
        currentProgress = { ...currentProgress, ...progress };
        if (currentProgress.isSet && currentProgress.amount > 0) {
            const el = document.getElementById('current-amount');
            if (el) el.value = currentProgress.amount;
            updateProgress(currentProgress.amount);
        }
    }
}

// Save progress to server JSON
function saveProgress() {
    // fire and forget
    storageSet('savingsProgress', currentProgress);
}

// History persistence (server)
async function loadHistory() {
    try {
        const data = await storageGet('calcHistory', []);
        calcHistory = Array.isArray(data) ? data : [];
    } catch { calcHistory = []; }
}

function persistHistory() {
    storageSet('calcHistory', calcHistory);
}

// Theme persistence (server)
async function loadTheme() {
    try {
        let vars = await storageGet('themeVars', null);
        if (!vars || !vars.version || vars.version !== 'simple-v1') {
            vars = { ...THEME_PRESETS.violetRose };
            applyTheme(vars);
            saveTheme(vars);
        } else {
            applyTheme(vars);
        }
        if (simplePrimary) simplePrimary.value = vars.primary;
        if (simpleSecondary) simpleSecondary.value = vars.secondary;
        if (simpleBg) simpleBg.value = vars.bg;
        if (simpleText) simpleText.value = vars.text;
    } catch {}
}

function saveTheme(vars) {
    storageSet('themeVars', vars);
}

function applyTheme(vars) {
    const root = document.documentElement;
    // Core
    if (vars.primary) root.style.setProperty('--primary-color', vars.primary);
    if (vars.primaryDark) root.style.setProperty('--primary-dark', vars.primaryDark);
    if (vars.secondary) root.style.setProperty('--secondary-color', vars.secondary);
    if (vars.bg) { root.style.setProperty('--bg-color', vars.bg); document.body.style.backgroundColor = vars.bg; }
    if (vars.text) root.style.setProperty('--text-color', vars.text);
    // Supportive
    if (vars.success) root.style.setProperty('--success-color', vars.success);
    if (vars.info) root.style.setProperty('--info-color', vars.info);
    if (vars.warning) root.style.setProperty('--warning-color', vars.warning);
    if (vars.danger) root.style.setProperty('--danger-color', vars.danger);
    if (vars.light) root.style.setProperty('--light-color', vars.light);
    if (vars.dark) root.style.setProperty('--dark-color', vars.dark);
    if (vars.cardBg) root.style.setProperty('--card-bg', vars.cardBg);
    if (vars.cardHover) root.style.setProperty('--card-hover', vars.cardHover);
    if (vars.textMuted) root.style.setProperty('--text-muted', vars.textMuted);
    if (vars.border) root.style.setProperty('--border-color', vars.border);
    if (vars.glassBg) root.style.setProperty('--glass-bg', vars.glassBg);
    if (vars.glassBorder) root.style.setProperty('--glass-border', vars.glassBorder);

    // Derived
    root.style.setProperty('--heading-fill', vars.headingFill);
    root.style.setProperty('--mini-heading-fill', vars.miniHeadingFill);
    root.style.setProperty('--theme-fill', vars.themeFill);
    root.style.setProperty('--sidebar-bg', vars.sidebarBg);
    root.style.setProperty('--calendar-bg', vars.calendarBg);
}

// Simple built-in theme preset (from the provided palette)
const THEME_PRESETS = {
    violetRose: deriveVarsFromSimple({
        primary: '#E0569A',
        secondary: '#FFB0B8',
        bg: '#2D155A',
        text: '#FCE7F3'
    })
};

function applyPreset(presetVars) {
    const vars = { ...presetVars };
    applyTheme(vars);
    if (simplePrimary) simplePrimary.value = vars.primary;
    if (simpleSecondary) simpleSecondary.value = vars.secondary;
    if (simpleBg) simpleBg.value = vars.bg;
    if (simpleText) simpleText.value = vars.text;
    saveTheme(vars);
}

// Calculate days to reach target amount
function calculateDaysToTarget(initial, target, dailyRate) {
    if (initial <= 0 || target <= initial || dailyRate <= 0) return 0;
    
    const dailyMultiplier = 1 + (dailyRate / 100);
    let days = 0;
    let current = initial;
    
    while (current < target && days < 1000) { // Prevent infinite loops
        current *= dailyMultiplier;
        days++;
    }
    
    return days <= 1000 ? days : 0; // Return 0 if it takes too long
}

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Intl currency formatter respecting chosen currency
function formatCurrencyIntl(amount) {
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: CURRENCY.code,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(typeof amount === 'number' ? amount : parseFloat(amount || 0));
    } catch (e) {
        // Fallback with symbol
        const n = typeof amount === 'number' ? amount : parseFloat(amount || 0);
        return `${CURRENCY.symbol}${(n || 0).toFixed(2)}`;
    }
}

// Update calculator results
function updateCalculatorResults() {
    const initial = parseFloat(document.getElementById('initial-amount').value) || 0;
    const ratePeriod = (document.getElementById('rate-period') || { value: 'per_year' }).value;
    const annualRate = parseFloat(document.getElementById('annual-rate').value) || 0; // in % if per_year, else per day
    const years = parseInt(document.getElementById('years').value || '0', 10);
    const months = parseInt(document.getElementById('months').value || '0', 10);
    const daysField = parseInt(document.getElementById('days').value || '0', 10);
    const startInput = document.getElementById('start-date');

    // Compute total calendar days (we'll convert to business days in generator if needed)
    const totalDays = (years * 365) + (months * 30) + daysField;
    TOTAL_DAYS = Math.max(totalDays, 1);

    // Daily interest rate in decimal
    let dailyRate = 0;
    if (ratePeriod === 'per_year') {
        const perYear = annualRate / 100;
        dailyRate = Math.pow(1 + perYear, 1 / 365) - 1;
    } else if (ratePeriod === 'per_month') {
        const perMonth = annualRate / 100;
        // Convert monthly effective to daily effective (30-day month approximation)
        dailyRate = Math.pow(1 + perMonth, 1 / 30) - 1;
    } else {
        dailyRate = (annualRate / 100);
    }

    // Reinvest percent
    REINVEST_PERCENT = parseFloat((document.getElementById('reinvest') || { value: '1' }).value) || 1;

    // Weekend toggle
    INCLUDE_WEEKENDS = document.querySelector('#weekends-toggle .segment.active')?.dataset.include !== 'false';
    
    // Update selected days from checkboxes if not including all days
    if (!INCLUDE_WEEKENDS) {
        SELECTED_DAYS = [];
        document.querySelectorAll('.day-checkbox:checked').forEach(cb => {
            SELECTED_DAYS.push(parseInt(cb.dataset.day));
        });
    }

    // Contributions
    const contribType = document.querySelector('#contrib-type .segment.active')?.dataset.type || 'none';
    const contribAmount = parseFloat(document.getElementById('contrib-amount')?.value || '0');
    const contribFrequency = (document.getElementById('contrib-frequency') || { value: 'weekly' }).value;
    CONTRIBUTION = { type: contribType, amount: isNaN(contribAmount) ? 0 : contribAmount, frequency: contribFrequency };

    // Start date
    if (startInput && startInput.value) {
        START_DATE = new Date(startInput.value + 'T00:00:00');
    }

    // Set globals
    INITIAL_AMOUNT = initial;
    DAILY_INTEREST_RATE = dailyRate; // decimal

    // Show results
    const targetInput = document.getElementById('target-amount');
    const effDaily = 1 + (DAILY_INTEREST_RATE * REINVEST_PERCENT);

    let showDays = 0;
    let showAmount = initial;

    if (targetInput && parseFloat(targetInput.value) > 0) {
        const target = parseFloat(targetInput.value) || 0;
        // Estimate days to target
        let current = initial;
        let days = 0;
        while (current < target && days < 5000) {
            current = current * effDaily + contributionForDay(days, START_DATE, CONTRIBUTION);
            days++;
        }
        showDays = days < 5000 ? days : 0;
        showAmount = current;
    } else {
        // Compute final amount after configured period respecting selected days
        let generated = 0;
        let dateCursor = new Date(START_DATE);
        let current = initial;
        while (generated <= TOTAL_DAYS) {
            if (!shouldIncludeDate(dateCursor)) {
                dateCursor.setDate(dateCursor.getDate() + 1);
                continue;
            }
            if (generated > 0) { // day 0 is initial state
                current = current * effDaily + contributionForDay(generated - 1, START_DATE, CONTRIBUTION);
            }
            generated++;
            dateCursor.setDate(dateCursor.getDate() + 1);
        }
        showDays = TOTAL_DAYS;
        showAmount = current;
    }

    const daysEl = document.getElementById('days-to-goal');
    const finalEl = document.getElementById('final-amount');
    if (daysEl) daysEl.textContent = showDays;
    if (finalEl) finalEl.textContent = formatCurrencyIntl(showAmount);

    // Recompute schedule and UI
    calculateInvestmentGrowth();
    generateCalendar();
    updateUI();
}

// Update investment parameters and recalculate
function updateInvestmentParameters(initial, rate, days) {
    INITIAL_AMOUNT = initial;
    DAILY_INTEREST_RATE = rate;
    TOTAL_DAYS = days;
    calculateInvestmentGrowth();
    generateCalendar();
    updateUI();
}

// Setup calculator event listeners
function setupCalculator() {
    const calculateBtn = document.getElementById('calculate-btn');
    setDefaultStartDate();

    // Currency segmented buttons
    document.querySelectorAll('#currency-group .segment').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#currency-group .segment').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            CURRENCY = { code: btn.dataset.code, symbol: btn.dataset.symbol };
            // Update all prefixes
            document.querySelectorAll('.input-prefix').forEach(el => el.textContent = CURRENCY.symbol);
            // Re-render amounts
            updateCalculatorResults();
        });
    });

    // Weekends toggle
    document.querySelectorAll('#weekends-toggle .segment').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#weekends-toggle .segment').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            INCLUDE_WEEKENDS = btn.dataset.include === 'true';
            
            // Show/hide day selector
            const daySelector = document.getElementById('day-selector');
            if (daySelector) {
                daySelector.style.display = INCLUDE_WEEKENDS ? 'none' : 'block';
            }
            
            updateCalculatorResults();
        });
    });
    
    // Day checkbox handlers
    document.querySelectorAll('.day-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            // Update SELECTED_DAYS based on checkboxes
            SELECTED_DAYS = [];
            document.querySelectorAll('.day-checkbox:checked').forEach(cb => {
                SELECTED_DAYS.push(parseInt(cb.dataset.day));
            });
            updateCalculatorResults();
        });
    });

    // Contributions type
    document.querySelectorAll('#contrib-type .segment').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#contrib-type .segment').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const show = btn.dataset.type !== 'none';
            document.getElementById('contrib-fields').style.display = show ? 'block' : 'none';
            updateCalculatorResults();
        });
    });

    // Inputs that should recalc on change
    [
        'initial-amount','annual-rate','rate-period','years','months','days','reinvest','contrib-amount','contrib-frequency','start-date','target-amount'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateCalculatorResults);
        if (el && el.tagName === 'SELECT') el.addEventListener('change', updateCalculatorResults);
    });

    if (calculateBtn) calculateBtn.addEventListener('click', () => { updateCalculatorResults(); addHistoryEntry(); });

    updateCalculatorResults();
}

// Initialize the application
async function init() {
    await Promise.all([
        loadProgress(),
        loadHistory(),
        loadTheme()
    ]);
    
    // Check for URL parameters
    const params = getUrlParams();
    if (params.amount > 0) {
        currentProgress.amount = params.amount;
        currentProgress.dailyRate = params.dailyRate;
        
        // Update UI with the amount
        const amountInput = document.getElementById('current-amount');
        if (amountInput) {
            amountInput.value = params.amount.toFixed(2);
        }
        
        // Update the progress
        updateProgress(params.amount);
    }
    
    // Initialize calculator
    setupCalculator();
    
    // Initialize investment calculations
    calculateInvestmentGrowth();
    generateCalendar();
    setupProgressTracking();
    
    // Sidebar navigation
    if (navCalculator) navCalculator.addEventListener('click', () => switchView('calculator'));
    if (navHistory) navHistory.addEventListener('click', () => switchView('history'));
    // Settings modal controls
    const openSettings = () => { if (settingsModal) { settingsModal.classList.add('open'); document.body.classList.add('modal-open'); } };
    const closeSettings = () => { if (settingsModal) { settingsModal.classList.remove('open'); document.body.classList.remove('modal-open'); } };
    if (navSettings) navSettings.addEventListener('click', openSettings);
    if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
    if (settingsClose) settingsClose.addEventListener('click', closeSettings);
    if (settingsBackdrop) settingsBackdrop.addEventListener('click', closeSettings);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && settingsModal?.classList.contains('open')) closeSettings(); });

    // Live preview: update CSS variables as user moves the simple pickers
    [simplePrimary, simpleSecondary, simpleBg, simpleText].filter(Boolean).forEach(p => {
        p.addEventListener('input', () => {
            const vars = getThemeFromInputs();
            applyTheme(vars); // preview only; do not persist until Save
        });
    });
    // Preset button
    const btnViolet = document.getElementById('preset-violet-rose');
    if (btnViolet) btnViolet.addEventListener('click', () => applyPreset(THEME_PRESETS.violetRose));
    // Save current selection
    if (settingsSave) settingsSave.addEventListener('click', () => {
        const vars = getThemeFromInputs();
        applyTheme(vars);
        saveTheme(vars);
        closeSettings();
    });
    // Reset to preset
    if (settingsReset) settingsReset.addEventListener('click', () => {
        const defaults = { ...THEME_PRESETS.violetRose };
        applyPreset(defaults);
        closeSettings();
    });

    // Default mount of savings card to Calculator view
    mountSavingsToCalculator();

    // History search wiring
    const searchEl = document.getElementById('history-search');
    if (searchEl) {
        searchEl.addEventListener('input', () => { historySearchQuery = searchEl.value; renderHistory(); });
    }
    // Render history
    renderHistory();
}

// Calculate compound interest growth over 80 days
function isWeekend(date) {
    const d = date.getDay();
    return d === 0 || d === 6;
}

// Check if a date should be included based on selected days
function shouldIncludeDate(date) {
    if (INCLUDE_WEEKENDS) {
        return true; // Include all days
    }
    // Check if day of week is in selected days
    const dayOfWeek = date.getDay();
    return SELECTED_DAYS.includes(dayOfWeek);
}

function contributionForDay(index, startDate, cfg) {
    if (cfg.type === 'none' || cfg.amount === 0) return 0;
    const sign = cfg.type === 'withdraw' ? -1 : 1;
    if (cfg.frequency === 'daily') return sign * cfg.amount;
    if (cfg.frequency === 'weekly') return (index % 7 === 0) ? sign * cfg.amount : 0;
    if (cfg.frequency === 'monthly') return (index % 30 === 0) ? sign * cfg.amount : 0;
    return 0;
}

function calculateInvestmentGrowth() {
    let currentAmount = INITIAL_AMOUNT;
    const today = new Date(); today.setHours(0,0,0,0);
    const startDate = new Date(START_DATE); startDate.setHours(0,0,0,0);

    investmentData = [];

    let generated = 0;
    let dateCursor = new Date(startDate);
    while (generated <= TOTAL_DAYS) {
        // Skip days not in selected days
        if (!shouldIncludeDate(dateCursor)) {
            dateCursor.setDate(dateCursor.getDate() + 1);
            continue;
        }

        const entry = {
            day: generated + 1,
            date: new Date(dateCursor),
            amount: currentAmount,
            isFuture: dateCursor > today
        };
        investmentData.push(entry);

        // next day
        const growthFactor = 1 + (DAILY_INTEREST_RATE * REINVEST_PERCENT);
        const add = contributionForDay(generated, startDate, CONTRIBUTION);
        currentAmount = parseFloat((currentAmount * growthFactor + add).toFixed(2));

        // move to next calendar day
        dateCursor.setDate(dateCursor.getDate() + 1);
        generated++;
    }
}

// Set up progress tracking event listeners
function setupProgressTracking() {
    const updateButton = document.getElementById('update-progress');
    const amountInput = document.getElementById('current-amount');
    const progressMessage = document.getElementById('progress-message');

    // Handle update button click
    updateButton.addEventListener('click', () => {
        const amount = parseFloat(amountInput.value);
        if (isNaN(amount) || amount < 0) {
            showMessage('Please enter a valid positive amount', 'error');
            return;
        }
        
        updateProgress(amount);
    });

    // Allow pressing Enter in the input field
    amountInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            updateButton.click();
        }
    });
}

// Update progress and highlight days
function updateProgress(amount) {
    console.log('Updating progress with amount:', amount);
    const progressMessage = document.getElementById('progress-message');
    let foundDay = 0; // Default to day 0 if no match found
    
    // Convert amount to number
    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) {
        showMessage('Please enter a valid amount', 'error');
        return;
    }
    
    // Find the first day where amount is greater than or equal to the target
    for (let i = 0; i < investmentData.length; i++) {
        if (investmentData[i].amount >= amount) {
            foundDay = i + 1; // +1 because days are 1-indexed
            break;
        }
    }
    
    // If no day found, use the last day
    if (foundDay === 0) {
        foundDay = investmentData.length;
        showMessage('Your savings are higher than the maximum projected amount!', 'info');
    } else {
        showMessage(`Your current savings are approximately equal to day ${foundDay} of the investment.`, 'success');
    }

    // Update progress
    currentProgress.amount = amount;
    currentProgress.day = foundDay;
    currentProgress.isSet = true;
    
    // Save to localStorage
    saveProgress();
    
    // Force a complete UI refresh
    updateUI();
    
    // Explicitly highlight reached days after a small delay to ensure DOM is updated
    setTimeout(() => {
        highlightReachedDays();
    }, 100);
    
    // Show success message
    if (foundDay >= investmentData.length) {
        showMessage('Your savings are higher than the maximum projected amount!', 'info');
    } else {
        showMessage(`Your current savings are approximately equal to day ${foundDay} of the investment.`, 'success');
    }
}

// Update the days elapsed display
function updateDaysElapsed(day) {
    const daysElapsedEl = document.getElementById('days-elapsed');
    if (daysElapsedEl) {
        daysElapsedEl.textContent = day;
    }
}

// Highlight days that have been reached
function highlightReachedDays() {
    console.log('Highlighting reached days. Current progress:', currentProgress);
    
    if (!currentProgress.isSet || currentProgress.day === 0) {
        console.log('No progress to highlight');
        return;
    }
    
    // Get all calendar days
    const allDays = document.querySelectorAll('.calendar-day');
    console.log('Found', allDays.length, 'calendar days');
    
    // First, remove all reached classes
    allDays.forEach(dayEl => {
        dayEl.classList.remove('reached');
    });
    
    // Then add reached class to days up to current progress
    allDays.forEach(dayEl => {
        const dayNumber = parseInt(dayEl.dataset.day, 10);
        if (!isNaN(dayNumber) && dayNumber <= currentProgress.day) {
            console.log('Marking day', dayNumber, 'as reached');
            dayEl.classList.add('reached');
            
            // Ensure past class is present for proper styling
            if (!dayEl.classList.contains('past')) {
                dayEl.classList.add('past');
            }
        }
    });
    
    console.log('Finished highlighting reached days');
}

// Show message to user
function showMessage(message, type = 'info') {
    const progressMessage = document.getElementById('progress-message');
    progressMessage.textContent = message;
    progressMessage.className = 'progress-message visible ' + type;
}

// Update the UI with current data
function updateUI() {
    if (investmentData.length === 0) return;
    
    let currentDay, nextDay;
    
    // Use saved progress if available
    if (currentProgress.isSet && currentProgress.day > 0) {
        const dayIndex = Math.min(currentProgress.day - 1, investmentData.length - 1);
        currentDay = investmentData[dayIndex];
        nextDay = investmentData[Math.min(dayIndex + 1, investmentData.length - 1)] || currentDay;
        updateDaysElapsed(currentProgress.day);
    } else {
        // Fallback to date-based calculation
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Default to first day
        currentDay = investmentData[0];
        nextDay = investmentData[1] || currentDay;
        
        // Find the current day based on date
        for (let i = 0; i < investmentData.length; i++) {
            const day = investmentData[i];
            const dayDate = new Date(day.date);
            dayDate.setHours(0, 0, 0, 0);
            
            if (dayDate <= today) {
                currentDay = day;
                nextDay = investmentData[i + 1] || currentDay;
            }
        }
    }
    
    // Update the calendar with current progress
    generateCalendar();
    
    // Update all UI elements
    if (currentDay) {
        // Update current value display
        const currentValueEl = document.getElementById('current-value');
        if (currentValueEl) {
            currentValueEl.textContent = `$${currentDay.amount.toFixed(2)}`;
        }
        
        // Update next day information
        if (nextDay) {
            const nextDayAmountEl = document.getElementById('next-day-amount');
            const nextDayValueEl = document.getElementById('next-day-value');
            
            if (nextDayAmountEl) {
                nextDayAmountEl.textContent = nextDay.amount.toFixed(2);
            }
            
            if (nextDayValueEl) {
                nextDayValueEl.textContent = `$${nextDay.amount.toFixed(2)}`;
            }
        }
        
        // Update the calendar highlights
        highlightReachedDays();
        return; // Skip the date-based calculation
    }
    
    for (let i = 0; i < investmentData.length; i++) {
        const day = investmentData[i];
        const dayDate = new Date(day.date);
        dayDate.setHours(0, 0, 0, 0);
        
        if (dayDate <= today) {
            currentDay = day;
            nextDay = investmentData[i + 1] || currentDay;
        }
    }
    
    // Update UI elements
    currentValueEl.textContent = formatCurrencyIntl(currentDay.amount);
    daysElapsedEl.textContent = currentDay.day - 1;
    if (nextDayValueEl) nextDayValueEl.textContent = formatCurrencyIntl(nextDay.amount);
    if (nextDayAmountEl) nextDayAmountEl.textContent = formatCurrencyIntl(nextDay.amount).replace(/[^0-9.,-]/g, '').replace(/^/, '');
}

// Generate the calendar with investment data
function generateCalendar() {
    // Clear the calendar
    calendarEl.innerHTML = '';
    
    // Keep the existing progress
    const savedProgress = { ...currentProgress };
    
    console.log('Generating calendar with progress:', savedProgress);
    
    // Group data by month
    const months = {};
    investmentData.forEach(day => {
        const date = new Date(day.date);
        const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        if (!months[monthYear]) {
            months[monthYear] = [];
        }
        
        months[monthYear].push(day);
    });
    
    // Create calendar for each month
    for (const [monthYear, days] of Object.entries(months)) {
        const monthSection = document.createElement('div');
        monthSection.className = 'month-section';
        
        const monthHeader = document.createElement('h3');
        monthHeader.className = 'month-header';
        monthHeader.textContent = monthYear;
        monthSection.appendChild(monthHeader);
        
        const monthGrid = document.createElement('div');
        monthGrid.className = 'month-grid';
        
        // Add day headers
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames.forEach(dayName => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            dayHeader.textContent = dayName;
            monthGrid.appendChild(dayHeader);
        });
        
        // Add empty cells for days before the first day of the month
        const firstDay = new Date(days[0].date);
        firstDay.setDate(1);
        const firstDayOfWeek = firstDay.getDay();
        
        for (let i = 0; i < firstDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            monthGrid.appendChild(emptyDay);
        }
        
        // Add calendar days
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        days.forEach(day => {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.dataset.day = day.day;
            
            // Check if this day should be marked as reached
            if (savedProgress.isSet && day.day <= savedProgress.day) {
                dayEl.classList.add('reached');
                console.log('Marking day', day.day, 'as reached');
                
                // Also add 'past' class to ensure proper styling
                if (!dayEl.classList.contains('past')) {
                    dayEl.classList.add('past');
                }
            }
            
            const dayDate = new Date(day.date);
            dayDate.setHours(0, 0, 0, 0);
            
            // Add past/future class
            if (day.isFuture) {
                dayEl.classList.add('future');
            } else {
                dayEl.classList.add('past');
            }
            
            // Add today class if it's the current date
            if (dayDate.getTime() === today.getTime()) {
                dayEl.classList.add('today');
            }
            
            // Format date for tooltip
            const formattedDate = dayDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            // Add tooltip with date and amount (use selected currency)
            dayEl.setAttribute('data-tooltip', `${formattedDate}\nAmount: ${formatCurrencyIntl(day.amount)}`);
            
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = dayDate.getDate();
            
            const dayAmount = document.createElement('div');
            dayAmount.className = 'day-amount';
            dayAmount.textContent = formatCurrencyIntl(day.amount);
            
            // Calculate and display profit for this day
            const dayProfit = document.createElement('div');
            dayProfit.className = 'day-profit';
            if (day.day > 1) {
                // Find previous day's amount
                const prevDayData = investmentData.find(d => d.day === day.day - 1);
                if (prevDayData) {
                    const profit = day.amount - prevDayData.amount;
                    dayProfit.textContent = `+${formatCurrencyIntl(profit)}`;
                } else {
                    const profit = day.amount - INITIAL_AMOUNT;
                    dayProfit.textContent = `+${formatCurrencyIntl(profit)}`;
                }
            } else {
                // First day, no profit yet
                dayProfit.textContent = 'Start';
            }
            
            dayEl.appendChild(dayNumber);
            dayEl.appendChild(dayAmount);
            dayEl.appendChild(dayProfit);
            monthGrid.appendChild(dayEl);
        });
        
        monthSection.appendChild(monthGrid);
        calendarEl.appendChild(monthSection);
    }
}

// Function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
