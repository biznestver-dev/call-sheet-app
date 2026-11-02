// src/timer.js

let timerTotalSeconds = 1500;
let timerRemainingSeconds = 1500;
let timerInterval = null;
let isTimerRunning = false;
let currentPhaseName = "Фаза: Мотор / Рабочий дубль";
const defaultTimerPhases = [
    { id: "prep", name: "Подготовка / Расстановка света", durationSeconds: 300 },
    { id: "work", name: "Мотор / Рабочий дубль", durationSeconds: 1500 },
    { id: "break", name: "Технический перерыв / Переход", durationSeconds: 300 }
];
let timerPhases = defaultTimerPhases.map(phase => ({ ...phase }));
let currentTimerPhaseId = "work";
let editPhaseHandler = () => {};
let removePhaseHandler = () => {};

// Флаг, чтобы автообновление слайдера не мешало, если пользователь крутит его вручную
let userIsInteractingWithTimeSlider = false;

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

export function getTimerPhases() {
    return timerPhases.map(phase => ({ ...phase }));
}

export function getCurrentTimerPhaseId() {
    return currentTimerPhaseId;
}

export function setTimerPhases(phases) {
    const previousCurrentPhase = timerPhases.find(phase => phase.id === currentTimerPhaseId);
    const validPhases = Array.isArray(phases)
        ? phases.filter(phase =>
            phase &&
            typeof phase.id === 'string' &&
            phase.id.trim() &&
            typeof phase.name === 'string' &&
            phase.name.trim() &&
            Number.isInteger(phase.durationSeconds) &&
            phase.durationSeconds >= 60 &&
            phase.durationSeconds <= 86400
        ).map(phase => ({
            id: phase.id,
            name: phase.name.trim(),
            durationSeconds: phase.durationSeconds
        }))
        : [];
    const seenIds = new Set();
    timerPhases = (validPhases.length ? validPhases : defaultTimerPhases)
        .filter(phase => {
            if (seenIds.has(phase.id)) return false;
            seenIds.add(phase.id);
            return true;
        })
        .map(phase => ({ ...phase }));

    const updatedCurrentPhase = timerPhases.find(phase => phase.id === currentTimerPhaseId);
    if (!updatedCurrentPhase) {
        currentTimerPhaseId = timerPhases[0].id;
        setTimerPhase(currentTimerPhaseId);
    } else if (
        previousCurrentPhase &&
        (previousCurrentPhase.name !== updatedCurrentPhase.name ||
            previousCurrentPhase.durationSeconds !== updatedCurrentPhase.durationSeconds)
    ) {
        setTimerPhase(currentTimerPhaseId);
    } else {
        renderTimerPhases();
    }
}

export function renderTimerPhases(onEdit = editPhaseHandler, onRemove = removePhaseHandler) {
    editPhaseHandler = onEdit;
    removePhaseHandler = onRemove;
    const container = document.getElementById('timer-phases-list');
    if (!container) return;

    container.replaceChildren();
    timerPhases.forEach(phase => {
        const group = document.createElement('div');
        group.className = "inline-flex items-center rounded border border-slate-700 overflow-hidden";

        const selectButton = document.createElement('button');
        selectButton.type = "button";
        selectButton.className = phase.id === currentTimerPhaseId
            ? "px-2 py-0.5 text-[10px] font-bold bg-sky-600 text-white transition shadow"
            : "px-2 py-0.5 text-[10px] font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition";
        selectButton.setAttribute('aria-pressed', String(phase.id === currentTimerPhaseId));
        const minutes = phase.durationSeconds / 60;
        const durationLabel = minutes >= 60 && minutes % 60 === 0
            ? `${minutes / 60} ч`
            : `${minutes} мин`;
        selectButton.textContent = `${phase.name} (${durationLabel})`;
        selectButton.addEventListener('click', () => setTimerPhase(phase.id));

        const editButton = document.createElement('button');
        editButton.type = "button";
        editButton.className = "px-1.5 py-0.5 bg-slate-900 text-slate-400 hover:text-sky-300 transition";
        editButton.title = `Редактировать фазу «${phase.name}»`;
        editButton.setAttribute('aria-label', editButton.title);
        editButton.innerHTML = '<i class="fa-solid fa-pen"></i>';
        editButton.addEventListener('click', () => editPhaseHandler(phase.id));

        const removeButton = document.createElement('button');
        removeButton.type = "button";
        removeButton.className = "px-1.5 py-0.5 bg-slate-900 text-slate-400 hover:text-red-400 transition disabled:opacity-30 disabled:cursor-not-allowed";
        removeButton.title = `Удалить фазу «${phase.name}»`;
        removeButton.setAttribute('aria-label', removeButton.title);
        removeButton.disabled = timerPhases.length === 1;
        removeButton.innerHTML = '<i class="fa-solid fa-trash"></i>';
        removeButton.addEventListener('click', () => removePhaseHandler(phase.id));

        group.append(selectButton, editButton, removeButton);
        container.append(group);
    });
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

export function setTimerPhase(phaseId) {
    const phase = timerPhases.find(item => item.id === phaseId);
    if (!phase) return;

    pauseTimer();
    currentTimerPhaseId = phase.id;
    currentPhaseName = `Фаза: ${phase.name}`;
    timerTotalSeconds = phase.durationSeconds;
    timerRemainingSeconds = timerTotalSeconds;
    updateTimerDisplay();
    renderTimerPhases();

    const hInput = document.getElementById('input-hours');
    const mInput = document.getElementById('input-mins');
    const sInput = document.getElementById('input-secs');
    if (hInput) hInput.value = String(Math.floor(timerTotalSeconds / 3600)).padStart(2, '0');
    if (mInput) mInput.value = String(Math.floor((timerTotalSeconds % 3600) / 60)).padStart(2, '0');
    if (sInput) sInput.value = String(timerTotalSeconds % 60).padStart(2, '0');

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

/**
 * Синхронизация слайдера времени суток (планеты/солнца) с реальным временем
 * @param {Function} updateSceneCallback - функция обновления 3D-сцены (принимает минуты от начала суток)
 */
export function initDayTimeSync(updateSceneCallback) {
    const timeSlider = document.getElementById('timeSlider');
    if (!timeSlider) return;

    // 1. Устанавливаем текущее суточное время при старте
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    timeSlider.value = currentMins;
    if (typeof updateSceneCallback === 'function') {
        updateSceneCallback(currentMins);
    }

    // 2. Отслеживаем ручной ввод/перемещение ползунка пользователем
    timeSlider.addEventListener('mousedown', () => { userIsInteractingWithTimeSlider = true; });
    timeSlider.addEventListener('touchstart', () => { userIsInteractingWithTimeSlider = true; });

    timeSlider.addEventListener('input', () => {
        userIsInteractingWithTimeSlider = true;
        const val = parseInt(timeSlider.value);
        if (typeof updateSceneCallback === 'function') {
            updateSceneCallback(val);
        }
    });

    const releaseInteraction = () => {
        // Даем небольшую паузу (3 секунды) перед возвратом автообновления
        setTimeout(() => { userIsInteractingWithTimeSlider = false; }, 3000);
    };

    timeSlider.addEventListener('mouseup', releaseInteraction);
    timeSlider.addEventListener('touchend', releaseInteraction);

    // 3. Автоматическое обновление времени каждую минуту (60 000 мс)
    setInterval(() => {
        if (!userIsInteractingWithTimeSlider) {
            const currentTime = new Date();
            const mins = currentTime.getHours() * 60 + currentTime.getMinutes();
            
            if (parseInt(timeSlider.value) !== mins) {
                timeSlider.value = mins;
                if (typeof updateSceneCallback === 'function') {
                    updateSceneCallback(mins);
                }
            }
        }
    }, 60000);
}