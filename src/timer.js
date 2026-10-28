// src/timer.js

let timerTotalSeconds = 1500;
let timerRemainingSeconds = 1500;
let timerInterval = null;
let isTimerRunning = false;
let currentPhaseName = "Фаза: Мотор / Рабочий дубль";

export function updateTimerDisplay() {
    const h = Math.floor(timerRemainingSeconds / 3600);
    const m = Math.floor((timerRemainingSeconds % 3600) / 60);
    const s = timerRemainingSeconds % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    
    const display = document.getElementById('timer-display');
    const fsDisplay = document.getElementById('fs-timer-display');
    if (display) display.innerText = timeStr;
    if (fsDisplay) fsDisplay.innerText = timeStr;
}

export function startTimer() {
    if (isTimerRunning) return;
    if (timerRemainingSeconds <= 0) timerRemainingSeconds = timerTotalSeconds;
    isTimerRunning = true;
    document.getElementById('timer-active-badge')?.classList.remove('hidden');

    timerInterval = setInterval(() => {
        if (timerRemainingSeconds > 0) {
            timerRemainingSeconds--;
            updateTimerDisplay();
        } else {
            pauseTimer();
            alert('⏰ Время таймера смены истекло!');
        }
    }, 1000);
}

export function pauseTimer() {
    isTimerRunning = false;
    clearInterval(timerInterval);
    document.getElementById('timer-active-badge')?.classList.add('hidden');
}

export function resetTimer() {
    pauseTimer();
    timerRemainingSeconds = timerTotalSeconds;
    updateTimerDisplay();
}

export function setTimerPreset(mins, secs = 0) {
    pauseTimer();
    timerTotalSeconds = (mins * 60) + secs;
    timerRemainingSeconds = timerTotalSeconds;
    
    const hInput = document.getElementById('input-hours');
    const mInput = document.getElementById('input-mins');
    const sInput = document.getElementById('input-secs');
    if (hInput) hInput.value = String(Math.floor(mins / 60)).padStart(2, '0');
    if (mInput) mInput.value = String(mins % 60).padStart(2, '0');
    if (sInput) sInput.value = String(secs).padStart(2, '0');
    
    updateTimerDisplay();
}

export function setCustomTimerFromInputs() {
    const h = parseInt(document.getElementById('input-hours')?.value) || 0;
    const m = parseInt(document.getElementById('input-mins')?.value) || 0;
    const s = parseInt(document.getElementById('input-secs')?.value) || 0;
    
    pauseTimer();
    timerTotalSeconds = (h * 3600) + (m * 60) + s;
    timerRemainingSeconds = timerTotalSeconds;
    updateTimerDisplay();
}

export function setTimerPhase(phaseType) {
    pauseTimer();
    
    const prepBtn = document.getElementById('phase-prep-btn');
    const workBtn = document.getElementById('phase-work-btn');
    const breakBtn = document.getElementById('phase-break-btn');
    
    if (prepBtn) prepBtn.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 transition";
    if (workBtn) workBtn.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 transition";
    if (breakBtn) breakBtn.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 transition";

    let mins = 25;
    if (phaseType === 'prep') {
        mins = 5;
        currentPhaseName = "Фаза: Подготовка / Расстановка света";
        if (prepBtn) prepBtn.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 transition shadow";
    } else if (phaseType === 'work') {
        mins = 25;
        currentPhaseName = "Фаза: Мотор / Рабочий дубль";
        if (workBtn) workBtn.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-sky-600 text-white transition shadow";
    } else if (phaseType === 'break') {
        mins = 5;
        currentPhaseName = "Фаза: Технический перерыв / Переход";
        if (breakBtn) breakBtn.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white transition shadow";
    }

    setTimerPreset(mins, 0);
    
    const modeDesc = document.getElementById('timer-mode-desc');
    const fsDesc = document.getElementById('fs-timer-phase-desc');
    if (modeDesc) modeDesc.innerText = currentPhaseName;
    if (fsDesc) fsDesc.innerText = currentPhaseName;
}

export function openTimerFullscreen() {
    document.getElementById('timer-fullscreen-modal')?.classList.remove('hidden');
}

export function closeTimerFullscreen() {
    document.getElementById('timer-fullscreen-modal')?.classList.add('hidden');
}