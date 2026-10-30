// src/main.js
import { defaultData } from './data.js';
import { 
    startTimer, pauseTimer, resetTimer, updateTimerDisplay, 
    setTimerPreset, setCustomTimerFromInputs, setTimerPhase, 
    openTimerFullscreen, closeTimerFullscreen, initDayTimeSync 
} from './timer.js';
import { 
    fetchWeatherData, calculateGoldenHours, 
    autoUpdateWeatherModeByTime, updateSunLightPosition 
} from './weather.js';
import { 
    initMiniMap, openMapRoute, showVenueDropdown, 
    filterVenues, handleCustomAddressKey, detectUserLocation 
} from './map.js';

let tg = window.Telegram?.WebApp;
if (tg && tg.initData) {
    tg.ready();
    tg.expand();
    if (tg.colorScheme === 'light') {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) themeIcon.className = "fa-solid fa-moon";
    }
}

let isEditMode = false;
let isNightVision = false;
let currentProductionType = "film";
let currentLat = 55.7618;
let currentLon = 37.6338;

let sceneGlobe, cameraGlobe, rendererGlobe, earthGroup, cloudsMesh, starFieldGlobe, sunLightGlobe, sunMeshGlobe, moonMeshGlobe;

// Глобальная привязка функций к window
window.startTimer = startTimer;
window.pauseTimer = pauseTimer;
window.resetTimer = resetTimer;
window.setTimerPreset = setTimerPreset;
window.setCustomTimerFromInputs = setCustomTimerFromInputs;
window.setTimerPhase = setTimerPhase;
window.openTimerFullscreen = openTimerFullscreen;
window.closeTimerFullscreen = closeTimerFullscreen;
window.toggleThemeMode = toggleThemeMode;
window.toggleNightVision = toggleNightVision;
window.exportPDF = exportPDF;
window.exportJSON = exportJSON;
window.importJSON = importJSON;
window.fetchWeatherData = () => fetchWeatherData(currentLat, currentLon);
window.setProductionType = setProductionType;
window.updateDateFromPicker = updateDateFromPicker;
window.syncGeneralDate = syncGeneralDate;
window.openMapRoute = openMapRoute;
window.showVenueDropdown = () => showVenueDropdown();
window.filterVenues = (q) => filterVenues(q);
window.handleCustomAddressKey = handleCustomAddressKey;
window.detectUserLocation = () => detectUserLocation((lat, lon) => {
    currentLat = lat;
    currentLon = lon;
    fetchWeatherData(currentLat, currentLon);
    saveChanges();
});
window.addSceneRow = addSceneRow;
window.removeSceneRow = removeSceneRow;
window.addTimelineRow = addTimelineRow;
window.removeTimelineRow = removeTimelineRow;
window.addDepartment = addDepartment;
window.removeDepartment = removeDepartment;
window.addCrewMember = addCrewMember;
window.removeCrewMember = removeCrewMember;
window.addContact = addContact;
window.removeContact = removeContact;
window.toggleEditMode = toggleEditMode;
window.saveChanges = saveChanges;
window.resetToDefaults = resetToDefaults;
window.updateReadinessProgress = updateReadinessProgress;
window.updateTimelineProgress = updateTimelineProgress;

function initApp() {
    const saved = localStorage.getItem('call_sheet_stage_data_v19');
    const data = saved ? JSON.parse(saved) : defaultData;
    renderData(data);
    init3DWidget();
    initMiniMap(currentLat, currentLon);
    calculateGoldenHours();
    updateSunLightPosition();
    updateTimerDisplay();
}

function renderData(data) {
    currentProductionType = data.productionType || "film";
    
    const filmBtn = document.getElementById('type-film-btn');
    const theaterBtn = document.getElementById('type-theater-btn');
    const iconEl = document.getElementById('project-icon');
    const weatherWidgetCard = document.getElementById('weather-widget-card');
    const spaceWidgetCard = document.getElementById('space-widget-card');

    if (currentProductionType === 'theater') {
        if (iconEl) iconEl.className = "fa-solid fa-masks-theater";
        if (theaterBtn) theaterBtn.className = "px-2.5 py-1.5 rounded-md font-medium transition bg-amber-500 text-slate-950";
        if (filmBtn) filmBtn.className = "px-2.5 py-1.5 rounded-md font-medium transition text-slate-300 hover:text-white";
        if (weatherWidgetCard) weatherWidgetCard.style.display = 'none';
        if (spaceWidgetCard) spaceWidgetCard.style.display = 'none';
    } else {
        if (iconEl) iconEl.className = "fa-solid fa-clapperboard";
        if (filmBtn) filmBtn.className = "px-2.5 py-1.5 rounded-md font-medium transition bg-amber-500 text-slate-950";
        if (theaterBtn) theaterBtn.className = "px-2.5 py-1.5 rounded-md font-medium transition text-slate-300 hover:text-white";
        if (weatherWidgetCard) weatherWidgetCard.style.display = 'flex';
        if (spaceWidgetCard) {
            spaceWidgetCard.style.display = 'flex';
            setTimeout(() => {
                if (!rendererGlobe) init3DWidget();
                else {
                    const container = document.getElementById('globeContainer');
                    if (container && rendererGlobe) {
                        rendererGlobe.setSize(container.clientWidth || 320, container.clientHeight || 160);
                    }
                }
            }, 50);
        }
    }

    const metaDay = document.getElementById('meta-day');
    const metaProject = document.getElementById('meta-project');
    const metaVersion = document.getElementById('meta-version');
    if (metaDay) metaDay.innerText = data.metaDay;
    if (metaProject) metaProject.innerText = data.metaProject;
    if (metaVersion) metaVersion.innerText = data.metaVersion;
    
    const dateInput = document.getElementById('meta-date-picker');
    const generalDateInput = document.getElementById('general-call-date');
    const targetDate = data.metaDate || data.generalCallDate || new Date().toISOString().split('T')[0];
    if (dateInput) dateInput.value = targetDate;
    if (generalDateInput) generalDateInput.value = targetDate;

    const generalTime = document.getElementById('general-call-time');
    const generalDesc = document.getElementById('general-call-desc');
    if (generalTime) generalTime.value = data.generalCallTime || "07:30";
    if (generalDesc) generalDesc.innerText = data.generalCallDesc;
    
    const sunRise = document.getElementById('sun-rise');
    const sunSet = document.getElementById('sun-set');
    if (sunRise && data.sunRise) sunRise.innerText = data.sunRise;
    if (sunSet && data.sunSet) sunSet.innerText = data.sunSet;

    const locName = document.getElementById('location-name');
    const locAddr = document.getElementById('location-address');
    const locMetro = document.getElementById('location-metro');
    const locBus = document.getElementById('location-bus');
    const locParking = document.getElementById('location-parking');

    if (locName) locName.innerText = data.locationName;
    if (locAddr) locAddr.innerText = data.locationAddress;
    if (locMetro) locMetro.innerText = data.locationMetro || "Метро поблизости";
    if (locBus) locBus.innerText = data.locationBus || "Наземный транспорт";
    if (locParking) locParking.innerText = data.locationParking;

    currentLat = data.lat || 55.7618;
    currentLon = data.lon || 37.6338;
    initMiniMap(currentLat, currentLon);

    const scenesTbody = document.getElementById('scenes-tbody');
    if (scenesTbody) {
        scenesTbody.innerHTML = '';
        if (currentProductionType === 'theater') {
            const activeTheaterScenes = data.theaterScenes || defaultData.theaterScenes;
            activeTheaterScenes.forEach((scene, index) => {
                scenesTbody.innerHTML += `
                    <tr class="hover:bg-slate-800/40 transition">
                        <td class="py-2.5 px-3 font-mono font-bold text-amber-400" contenteditable="${isEditMode}" data-tscene-act="${index}">${scene.act}</td>
                        <td class="py-2.5 px-3 text-slate-300 font-semibold" contenteditable="${isEditMode}" data-tscene-scene="${index}">${scene.scene}</td>
                        <td class="py-2.5 px-3 text-slate-200 editable-field" contenteditable="${isEditMode}" data-tscene-desc="${index}">${scene.desc}</td>
                        <td class="py-2.5 px-3 text-slate-400 font-mono" contenteditable="${isEditMode}" data-tscene-time="${index}">${scene.time}</td>
                        <td class="py-2.5 px-3 text-sky-400 font-medium" contenteditable="${isEditMode}" data-tscene-cast="${index}">${scene.cast}</td>
                        <td class="py-2.5 px-3 text-right edit-action-btn ${isEditMode ? '' : 'hidden'}">
                            <button onclick="removeSceneRow(${index})" class="text-red-400 hover:text-red-300 px-2 py-1"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        } else {
            const activeScenes = data.scenes || defaultData.scenes;
            activeScenes.forEach((scene, index) => {
                scenesTbody.innerHTML += `
                    <tr class="hover:bg-slate-800/40 transition">
                        <td class="py-2.5 px-3 font-mono font-bold text-amber-400" contenteditable="${isEditMode}" data-scene-num="${index}">${scene.num}</td>
                        <td class="py-2.5 px-3 text-slate-300 font-semibold" contenteditable="${isEditMode}" data-scene-ie="${index}">${scene.ie}</td>
                        <td class="py-2.5 px-3 text-slate-200 editable-field" contenteditable="${isEditMode}" data-scene-desc="${index}">${scene.desc}</td>
                        <td class="py-2.5 px-3 text-slate-400 font-mono" contenteditable="${isEditMode}" data-scene-time="${index}">${scene.time}</td>
                        <td class="py-2.5 px-3 text-sky-400 font-medium" contenteditable="${isEditMode}" data-scene-cast="${index}">${scene.cast}</td>
                        <td class="py-2.5 px-3 text-right edit-action-btn ${isEditMode ? '' : 'hidden'}">
                            <button onclick="removeSceneRow(${index})" class="text-red-400 hover:text-red-300 px-2 py-1"><i class="fa-solid fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });
        }
    }

    const timelineTbody = document.getElementById('timeline-tbody');
    if (timelineTbody) {
        timelineTbody.innerHTML = '';
        const activeTimeline = (currentProductionType === 'theater') ? (data.theaterTimeline || defaultData.theaterTimeline) : (data.timeline || defaultData.timeline);
        
        activeTimeline.forEach((item, index) => {
            let timeCellContent = isEditMode 
                ? `<input type="time" value="${item.time}" class="bg-slate-800 text-amber-400 font-mono font-bold px-2 py-1 rounded border border-slate-700 text-sm outline-none" data-timeline-time="${index}">`
                : `<span class="font-mono font-bold text-amber-400 text-base" data-timeline-time="${index}" data-time-val="${item.time}">${item.time}</span>`;

            const isDone = item.done ? 'checked' : '';
            const rowClass = item.done ? 'bg-emerald-950/20 text-slate-400 line-through' : '';

            timelineTbody.innerHTML += `
                <tr class="hover:bg-slate-800/40 transition ${rowClass}" id="timeline-row-${index}">
                    <td class="py-2.5 px-3 flex items-center space-x-2">
                        <input type="checkbox" class="timeline-done-checkbox accent-emerald-500 cursor-pointer w-4 h-4" ${isDone} onchange="updateTimelineProgress(${index})" title="Отметить выполненным">
                        ${timeCellContent}
                    </td>
                    <td class="py-2.5 px-3 text-slate-200 editable-field" contenteditable="${isEditMode}" data-timeline-event="${index}">${item.event}</td>
                    <td class="py-2.5 px-3 text-slate-400 editable-field" contenteditable="${isEditMode}" data-timeline-resp="${index}">${item.responsible}</td>
                    <td class="py-2.5 px-3 text-right edit-action-btn ${isEditMode ? '' : 'hidden'}">
                        <button onclick="removeTimelineRow(${index})" class="text-red-400 hover:text-red-300 px-2 py-1"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    }

    const deptContainer = document.getElementById('departments-container');
    if (deptContainer) {
        deptContainer.innerHTML = '';
        const activeDepts = (currentProductionType === 'theater') ? (data.theaterDepartments || defaultData.theaterDepartments) : (data.departments || defaultData.departments);

        activeDepts.forEach((dept, dIndex) => {
            let crewRows = '';
            dept.crew.forEach((c, cIndex) => {
                const cleanPhone = c.phone.replace(/[^+\d]/g, '');
                crewRows += `
                    <div class="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0 text-sm">
                        <div>
                            <div class="text-xs text-slate-400 editable-field" contenteditable="${isEditMode}" data-dept-role="${dIndex}-${cIndex}">${c.role}</div>
                            <div class="font-semibold text-white editable-field" contenteditable="${isEditMode}" data-dept-name="${dIndex}-${cIndex}">${c.name}</div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <a href="tel:${cleanPhone}" class="text-xs text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-md transition flex items-center space-x-1 shadow-sm editable-field" contenteditable="${isEditMode}" data-dept-phone="${dIndex}-${cIndex}">
                                <i class="fa-solid fa-phone text-[10px]"></i><span>${c.phone}</span>
                            </a>
                            ${isEditMode ? `<button onclick="removeCrewMember(${dIndex}, ${cIndex})" class="text-red-400 hover:text-red-300 text-xs px-1"><i class="fa-solid fa-xmark"></i></button>` : ''}
                        </div>
                    </div>
                `;
            });

            let deptCallTimeContent = isEditMode
                ? `<input type="time" value="${dept.time}" class="bg-slate-800 text-amber-400 font-mono font-bold px-1.5 py-0.5 rounded border border-slate-700 text-xs outline-none inline-block" data-dept-calltime="${dIndex}">`
                : `<strong class="text-amber-400 font-mono" data-dept-calltime="${dIndex}" data-time-val="${dept.time}">${dept.time}</strong>`;

            deptContainer.innerHTML += `
                <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
                            <div>
                                <h3 class="font-bold text-white uppercase tracking-wider text-sm editable-field" contenteditable="${isEditMode}" data-dept-title="${dIndex}">${dept.name}</h3>
                                <span class="text-xs text-slate-400">Сбор: ${deptCallTimeContent}</span>
                            </div>
                            <div class="flex items-center space-x-2">
                                <label class="flex items-center space-x-1 cursor-pointer text-xs bg-slate-950 px-2 py-1 rounded border border-slate-800" title="Готовность">
                                    <input type="checkbox" class="department-ready-checkbox accent-amber-500 cursor-pointer" ${dept.ready ? 'checked' : ''} onchange="updateReadinessProgress()">
                                    <span class="text-slate-300">Готов</span>
                                </label>
                                ${isEditMode ? `<button onclick="removeDepartment(${dIndex})" class="text-red-400 hover:text-red-300 text-xs"><i class="fa-solid fa-trash"></i></button>` : ''}
                            </div>
                        </div>
                        <div class="space-y-1">${crewRows}</div>
                    </div>
                    ${isEditMode ? `<div class="mt-4 pt-2 border-t border-slate-800"><button onclick="addCrewMember(${dIndex})" class="w-full py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition">+ Сотрудник</button></div>` : ''}
                </div>
            `;
        });
    }

    const contactsGrid = document.getElementById('contacts-grid');
    if (contactsGrid) {
        contactsGrid.innerHTML = '';
        data.contacts.forEach((contact, index) => {
            const cleanPhone = contact.phone.replace(/[^+\d]/g, '');
            contactsGrid.innerHTML += `
                <div class="bg-slate-950/50 p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between">
                    <div>
                        <div class="text-xs text-slate-400 editable-field" contenteditable="${isEditMode}" data-contact-role="${index}">${contact.role}</div>
                        <div class="font-bold text-white text-sm editable-field" contenteditable="${isEditMode}" data-contact-name="${index}">${contact.name}</div>
                    </div>
                    <div class="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <a href="tel:${cleanPhone}" class="text-xs text-amber-400 font-semibold hover:underline flex items-center space-x-1 editable-field" contenteditable="${isEditMode}" data-contact-phone="${index}">
                            <i class="fa-solid fa-phone text-[10px]"></i><span>${contact.phone}</span>
                        </a>
                        ${isEditMode ? `<button onclick="removeContact(${index})" class="text-red-400 hover:text-red-300 text-xs"><i class="fa-solid fa-trash"></i></button>` : ''}
                    </div>
                </div>
            `;
        });
    }

    calculateGoldenHours();
    updateSunLightPosition();
    updateReadinessProgress();
}

function exportJSON() {
    const data = collectDataFromDOM();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `CallSheet_${data.metaDate || 'shift'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importJSON(event) {
    const fileReader = new FileReader();
    if (event.target.files[0]) {
        fileReader.readAsText(event.target.files[0], "UTF-8");
        fileReader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                localStorage.setItem('call_sheet_stage_data_v19', JSON.stringify(importedData));
                renderData(importedData);
                if (importedData.lat && importedData.lon) {
                    currentLat = importedData.lat;
                    currentLon = importedData.lon;
                    initMiniMap(currentLat, currentLon);
                    fetchWeatherData(currentLat, currentLon);
                }
                alert('✅ Смена успешно импортирована!');
            } catch (error) {
                alert('❌ Ошибка чтения JSON файла.');
                console.error(error);
            }
        };
    }
}

function toggleNightVision() {
    isNightVision = !isNightVision;
    const btn = document.getElementById('night-vision-btn');
    if (isNightVision) {
        document.documentElement.style.filter = "hue-rotate(320deg) contrast(1.15) brightness(0.9)";
        if (btn) btn.className = "p-2 rounded-lg bg-red-950 border border-red-700 text-red-400 hover:bg-red-900 text-sm transition shadow-[0_0_15px_rgba(239,68,68,0.4)]";
    } else {
        document.documentElement.style.filter = "none";
        if (btn) btn.className = "p-2 rounded-lg bg-slate-800 border border-slate-700 text-amber-500 hover:bg-slate-700 text-sm transition";
    }
}

function updateTimelineProgress(index) {
    const checkbox = document.querySelectorAll('.timeline-done-checkbox')[index];
    const row = document.getElementById(`timeline-row-${index}`);
    if (checkbox && row) {
        if (checkbox.checked) {
            row.className = "hover:bg-slate-800/40 transition bg-emerald-950/20 text-slate-400 line-through";
        } else {
            row.className = "hover:bg-slate-800/40 transition";
        }
        saveChanges();
    }
}

async function updateDateFromPicker(input) {
    const generalDateInput = document.getElementById('general-call-date');
    if (generalDateInput && generalDateInput.value !== input.value) {
        generalDateInput.value = input.value;
    }
    if (currentProductionType === 'film') {
        await fetchWeatherData(currentLat, currentLon);
    }
    updateSunLightPosition();
    saveChanges();
}

function syncGeneralDate(input) {
    const mainDatePicker = document.getElementById('meta-date-picker');
    if (mainDatePicker) {
        mainDatePicker.value = input.value;
        updateDateFromPicker(mainDatePicker);
    } else {
        updateDateFromPicker(input);
    }
}

function setProductionType(type) {
    currentProductionType = type;
    renderData(collectDataFromDOM());
}

function updateReadinessProgress() {
    const checkboxes = document.querySelectorAll('.department-ready-checkbox');
    if (checkboxes.length === 0) return;
    let checkedCount = 0;
    checkboxes.forEach(cb => { if (cb.checked) checkedCount++; });
    const percent = Math.round((checkedCount / checkboxes.length) * 100);
    const pEl = document.getElementById('readiness-percent');
    const bEl = document.getElementById('readiness-bar');
    if (pEl) pEl.innerText = `${percent}%`;
    if (bEl) bEl.style.width = `${percent}%`;
}

function toggleThemeMode() {
    const htmlEl = document.documentElement;
    const themeIcon = document.getElementById('theme-icon');
    if (htmlEl.classList.contains('dark')) {
        htmlEl.classList.remove('dark');
        htmlEl.classList.add('light');
        if (themeIcon) themeIcon.className = "fa-solid fa-moon";
    } else {
        htmlEl.classList.remove('light');
        htmlEl.classList.add('dark');
        if (themeIcon) themeIcon.className = "fa-solid fa-sun";
    }
}

function exportPDF() {
    const element = document.getElementById('pdf-export-container');
    const opt = {
        margin:       10,
        filename:     `Call_Sheet_${document.getElementById('meta-date-picker')?.value || 'shift'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    const wasDark = document.documentElement.classList.contains('dark');
    if (wasDark) { document.documentElement.classList.remove('dark'); document.documentElement.classList.add('light'); }
    html2pdf().from(element).set(opt).save().then(() => {
        if (wasDark) { document.documentElement.classList.remove('light'); document.documentElement.classList.add('dark'); }
    });
}

function init3DWidget() {
    const container = document.getElementById('globeContainer');
    if (!container) return;
    container.innerHTML = '';
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 160;

    sceneGlobe = new THREE.Scene();
    cameraGlobe = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraGlobe.position.set(0, 0, 4.6);

    rendererGlobe = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererGlobe.setSize(width, height);
    rendererGlobe.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererGlobe.toneMapping = THREE.ACESFilmicToneMapping;
    rendererGlobe.toneMappingExposure = 1.2;
    container.appendChild(rendererGlobe.domElement);

    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 600;
    const starPositions = new Float32Array(starsCount * 3);
    for(let i = 0; i < starsCount * 3; i += 3) {
        starPositions[i] = (Math.random() - 0.5) * 25;
        starPositions[i+1] = (Math.random() - 0.5) * 25;
        starPositions[i+2] = (Math.random() - 0.5) * 25;
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starFieldGlobe = new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.7 }));
    sceneGlobe.add(starFieldGlobe);

    earthGroup = new THREE.Group();
    sceneGlobe.add(earthGroup);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');
    const earthRadius = 1.1;
    const earthGeometry = new THREE.SphereGeometry(earthRadius, 64, 64);
    const earthMaterial = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1, color: 0x1d4ed8 });

    textureLoader.load('https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_atmos_2048.jpg', (tex) => { 
        earthMaterial.map = tex; 
        earthMaterial.color.setHex(0xffffff);
        earthMaterial.needsUpdate = true; 
    });
    textureLoader.load('https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_specular_2048.jpg', (tex) => { 
        earthMaterial.roughnessMap = tex; 
        earthMaterial.needsUpdate = true; 
    });

    earthGroup.add(new THREE.Mesh(earthGeometry, earthMaterial));

    const cloudsGeometry = new THREE.SphereGeometry(earthRadius + 0.015, 64, 64);
    const cloudsMaterial = new THREE.MeshStandardMaterial({ transparent: true, blending: THREE.AdditiveBlending, opacity: 0.35 });
    textureLoader.load('https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_clouds_1024.png', (tex) => { 
        cloudsMaterial.map = tex; 
        cloudsMaterial.needsUpdate = true; 
    });
    cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
    earthGroup.add(cloudsMesh);

    sunLightGlobe = new THREE.DirectionalLight(0xfffaed, 2.5);
    sceneGlobe.add(sunLightGlobe);
    sceneGlobe.add(new THREE.AmbientLight(0x111b33, 0.4));

    sunMeshGlobe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffdd44 }));
    sceneGlobe.add(sunMeshGlobe);

    moonMeshGlobe = new THREE.Mesh(new THREE.SphereGeometry(0.25, 32, 32), new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9 }));
    sceneGlobe.add(moonMeshGlobe);

    // Интеграция автосинхронизации времени суток из модуля timer.js
    initDayTimeSync((minutesOfDay) => {
        updateSceneByTime(minutesOfDay);
    });

    function animateGlobe() {
        requestAnimationFrame(animateGlobe);
        if (starFieldGlobe) starFieldGlobe.rotation.y += 0.0002;
        rendererGlobe.render(sceneGlobe, cameraGlobe);
    }
    animateGlobe();
}

function updateSceneByTime(minutesOfDay) {
    const hours = Math.floor(minutesOfDay / 60);
    const mins = Math.floor(minutesOfDay % 60);
    const timeStr = String(hours).padStart(2, '0') + ':' + String(mins).padStart(2, '0');
    
    const timeDisplay = document.getElementById('currentTimeDisplay');
    if (timeDisplay) timeDisplay.textContent = timeStr;

    autoUpdateWeatherModeByTime(hours);
    highlightHourlyForecast(hours);

    const dayProgress = minutesOfDay / 1440;
    const angle = dayProgress * Math.PI * 2;

    if (earthGroup && cloudsMesh) {
        earthGroup.rotation.y = angle * 2;
        cloudsMesh.rotation.y = angle * 2.2;
    }

    const sunDistance = 3.0;
    const sunAngle = (dayProgress - 0.25) * Math.PI * 2;
    const sunX = Math.cos(sunAngle) * sunDistance;
    const sunY = Math.sin(sunAngle) * sunDistance;
    
    if (sunMeshGlobe && sunLightGlobe) {
        sunMeshGlobe.position.set(sunX, sunY, -0.5);
        sunLightGlobe.position.copy(sunMeshGlobe.position);
    }

    if (moonMeshGlobe) {
        const moonAngle = sunAngle + Math.PI;
        const moonX = Math.cos(moonAngle) * sunDistance;
        const moonY = Math.sin(moonAngle) * sunDistance;
        moonMeshGlobe.position.set(moonX, moonY, -0.5);
    }
}

function highlightHourlyForecast(currentHour) {
    const grid = document.getElementById('hourly-forecast-grid');
    if (!grid) return;
    const items = grid.querySelectorAll('[data-hour]');
    
    const slots = [6, 9, 12, 15, 18, 21, 0, 3];
    let closestSlot = slots.reduce((prev, curr) => Math.abs(curr - currentHour) < Math.abs(prev - currentHour) ? curr : prev);

    items.forEach(item => {
        const h = parseInt(item.getAttribute('data-hour'), 10);
        if (h === closestSlot) {
            item.className = "flex flex-col items-center font-bold text-slate-950 bg-amber-400 rounded-lg py-0.5 shadow-md scale-105 transition-all";
        } else {
            item.className = "flex flex-col items-center opacity-70 transition-all";
        }
    });
}

function collectDataFromDOM() {
    let data = {
        productionType: currentProductionType,
        metaDay: document.getElementById('meta-day')?.innerText || '',
        metaProject: document.getElementById('meta-project')?.innerText || '',
        metaDate: document.getElementById('meta-date-picker')?.value || '',
        metaVersion: document.getElementById('meta-version')?.innerText || '',
        generalCallTime: document.getElementById('general-call-time')?.value || '',
        generalCallDate: document.getElementById('general-call-date')?.value || '',
        generalCallDesc: document.getElementById('general-call-desc')?.innerText || '',
        weatherTemp: document.getElementById('temp-main')?.innerText || '',
        weatherCondition: document.getElementById('condition-main')?.innerText || '',
        weatherWind: document.getElementById('wind-val')?.innerText || '',
        weatherHumidity: document.getElementById('humidity-val')?.innerText || '',
        weatherPressure: document.getElementById('pressure-val')?.innerText || '',
        sunRise: document.getElementById('sun-rise')?.innerText || '',
        sunSet: document.getElementById('sun-set')?.innerText || '',
        locationName: document.getElementById('location-name')?.innerText || '',
        locationAddress: document.getElementById('location-address')?.innerText || '',
        locationMetro: document.getElementById('location-metro')?.innerText || '',
        locationBus: document.getElementById('location-bus')?.innerText || '',
        locationParking: document.getElementById('location-parking')?.innerText || '',
        lat: currentLat,
        lon: currentLon,
        scenes: [], theaterScenes: [], timeline: [], theaterTimeline: [], departments: [], theaterDepartments: [], contacts: []
    };

    if (currentProductionType === 'theater') {
        document.querySelectorAll('[data-tscene-act]').forEach((el, index) => {
            const act = el.innerText;
            const scene = document.querySelector(`[data-tscene-scene="${index}"]`)?.innerText || '';
            const desc = document.querySelector(`[data-tscene-desc="${index}"]`)?.innerText || '';
            const time = document.querySelector(`[data-tscene-time="${index}"]`)?.innerText || '';
            const cast = document.querySelector(`[data-tscene-cast="${index}"]`)?.innerText || '';
            data.theaterScenes.push({ act, scene, desc, time, cast });
        });
    } else {
        document.querySelectorAll('[data-scene-num]').forEach((el, index) => {
            const num = el.innerText;
            const ie = document.querySelector(`[data-scene-ie="${index}"]`)?.innerText || '';
            const desc = document.querySelector(`[data-scene-desc="${index}"]`)?.innerText || '';
            const time = document.querySelector(`[data-scene-time="${index}"]`)?.innerText || '';
            const cast = document.querySelector(`[data-scene-cast="${index}"]`)?.innerText || '';
            data.scenes.push({ num, ie, desc, time, cast });
        });
    }

    document.querySelectorAll('[data-timeline-time]').forEach((el, index) => {
        let rawTime = isEditMode ? (el.value || "00:00") : (el.getAttribute('data-time-val') || "00:00");
        const event = document.querySelector(`[data-timeline-event="${index}"]`)?.innerText || '';
        const responsible = document.querySelector(`[data-timeline-resp="${index}"]`)?.innerText || '';
        const isDone = document.querySelectorAll('.timeline-done-checkbox')[index]?.checked || false;
        
        if (currentProductionType === 'theater') {
            data.theaterTimeline.push({ time: rawTime, event, responsible, done: isDone });
        } else {
            data.timeline.push({ time: rawTime, event, responsible, done: isDone });
        }
    });

    let deptIndices = new Set();
    document.querySelectorAll('[data-dept-title]').forEach(el => deptIndices.add(el.getAttribute('data-dept-title')));
    deptIndices.forEach(dIdx => {
        const name = document.querySelector(`[data-dept-title="${dIdx}"]`)?.innerText || '';
        const timeEl = document.querySelector(`[data-dept-calltime="${dIdx}"]`);
        let deptTime = isEditMode ? (timeEl?.value || "00:00") : (timeEl?.getAttribute('data-time-val') || "00:00");
        const readyCheckbox = document.querySelectorAll('.department-ready-checkbox')[dIdx];
        const isReady = readyCheckbox ? readyCheckbox.checked : true;

        let crew = [];
        let cIndices = new Set();
        document.querySelectorAll(`[data-dept-role^="${dIdx}-"]`).forEach(el => {
            cIndices.add(el.getAttribute('data-dept-role').split('-')[1]);
        });
        cIndices.forEach(cIdx => {
            const role = document.querySelector(`[data-dept-role="${dIdx}-${cIdx}"]`)?.innerText || '';
            const name = document.querySelector(`[data-dept-name="${dIdx}-${cIdx}"]`)?.innerText || '';
            const phone = document.querySelector(`[data-dept-phone="${dIdx}-${cIdx}"]`)?.innerText || '';
            crew.push({ role, name, phone });
        });

        if (currentProductionType === 'theater') {
            data.theaterDepartments.push({ name, time: deptTime, ready: isReady, crew });
        } else {
            data.departments.push({ name, time: deptTime, ready: isReady, crew });
        }
    });

    document.querySelectorAll('[data-contact-role]').forEach((el, index) => {
        const role = el.innerText;
        const name = document.querySelector(`[data-contact-name="${index}"]`)?.innerText || '';
        const phone = document.querySelector(`[data-contact-phone="${index}"]`)?.innerText || '';
        data.contacts.push({ role, name, phone });
    });

    return data;
}

function toggleEditMode() {
    isEditMode = !isEditMode;
    const btnText = document.getElementById('edit-mode-text');
    const btn = document.getElementById('edit-mode-btn');
    const generalCallTime = document.getElementById('general-call-time');
    const generalCallHint = document.getElementById('general-call-hint');
    const venueSearchContainer = document.getElementById('venue-search-container');

    if (isEditMode) {
        if (btnText) btnText.innerText = "Готово (Просмотр)";
        if (btn) {
            btn.classList.add('bg-amber-500', 'text-slate-950', 'border-amber-400');
            btn.classList.remove('bg-amber-500/10', 'text-amber-400');
        }
        if (generalCallTime) generalCallTime.removeAttribute('disabled');
        if (generalCallHint) generalCallHint.style.display = 'none';
        if (venueSearchContainer) venueSearchContainer.classList.remove('hidden');

        document.querySelectorAll('.editable-field').forEach(el => el.setAttribute('contenteditable', 'true'));
        document.querySelectorAll('.edit-action-btn').forEach(el => el.classList.remove('hidden'));
    } else {
        saveChanges();
        if (btnText) btnText.innerText = "Режим правки";
        if (btn) {
            btn.classList.remove('bg-amber-500', 'text-slate-950', 'border-amber-400');
            btn.classList.add('bg-amber-500/10', 'text-amber-400');
        }
        if (generalCallTime) generalCallTime.setAttribute('disabled', 'true');
        if (generalCallHint) generalCallHint.style.display = 'inline';
        if (venueSearchContainer) venueSearchContainer.classList.add('hidden');

        document.querySelectorAll('.editable-field').forEach(el => el.setAttribute('contenteditable', 'false'));
        document.querySelectorAll('.edit-action-btn').forEach(el => el.classList.add('hidden'));
    }
    renderData(collectDataFromDOM());
}

function saveChanges() {
    const data = collectDataFromDOM();
    localStorage.setItem('call_sheet_stage_data_v19', JSON.stringify(data));
    calculateGoldenHours();
    updateReadinessProgress();
}

function resetToDefaults() {
    if (confirm('Сбросить изменения по умолчанию?')) {
        localStorage.removeItem('call_sheet_stage_data_v19');
        renderData(defaultData);
        fetchWeatherData(defaultData.lat, defaultData.lon);
    }
}

function addSceneRow() {
    let d = collectDataFromDOM();
    if (currentProductionType === 'theater') {
        d.theaterScenes.push({ act: "Акт II", scene: "Картина 1", desc: "Новая картина", time: "15 мин", cast: "Артисты" });
    } else {
        d.scenes.push({ num: "16", ie: "ИНТ.", desc: "Новая сцена", time: "1/8", cast: "—" });
    }
    renderData(d);
}

function removeSceneRow(i) {
    let d = collectDataFromDOM();
    if (currentProductionType === 'theater') { d.theaterScenes.splice(i, 1); } else { d.scenes.splice(i, 1); }
    renderData(d);
}

function addTimelineRow() {
    let d = collectDataFromDOM();
    if (currentProductionType === 'theater') {
        d.theaterTimeline.push({ time: "15:00", event: "Новая репетиция", responsible: "ПР", done: false });
    } else {
        d.timeline.push({ time: "12:00", event: "Новое событие", responsible: "Ответственный", done: false });
    }
    renderData(d);
}

function removeTimelineRow(i) {
    let d = collectDataFromDOM();
    if (currentProductionType === 'theater') { d.theaterTimeline.splice(i, 1); } else { d.timeline.splice(i, 1); }
    renderData(d);
}

function addDepartment() {
    let d = collectDataFromDOM();
    if (currentProductionType === 'theater') {
        d.theaterDepartments.push({ name: "Новый цех", time: "10:00", ready: false, crew: [{ role: "Мастер", name: "Имя", phone: "+7..." }] });
    } else {
        d.departments.push({ name: "Новый отдел", time: "08:00", ready: false, crew: [{ role: "Сотрудник", name: "Имя", phone: "+7..." }] });
    }
    renderData(d);
}

function removeDepartment(i) {
    let d = collectDataFromDOM();
    if (currentProductionType === 'theater') { d.theaterDepartments.splice(i, 1); } else { d.departments.splice(i, 1); }
    renderData(d);
}

function addCrewMember(dIdx) {
    let d = collectDataFromDOM();
    const targetDepts = (currentProductionType === 'theater') ? d.theaterDepartments : d.departments;
    targetDepts[dIdx].crew.push({ role: "Должность", name: "Имя", phone: "+7..." });
    renderData(d);
}

function removeCrewMember(dIdx, cIdx) {
    let d = collectDataFromDOM();
    const targetDepts = (currentProductionType === 'theater') ? d.theaterDepartments : d.departments;
    targetDepts[dIdx].crew.splice(cIdx, 1);
    renderData(d);
}

function addContact() {
    let d = collectDataFromDOM();
    d.contacts.push({ role: "Должность", name: "Имя", phone: "+7..." });
    renderData(d);
}

function removeContact(i) {
    let d = collectDataFromDOM();
    d.contacts.splice(i, 1);
    renderData(d);
}

window.addEventListener('DOMContentLoaded', () => {
    initApp();
    fetchWeatherData(currentLat, currentLon);
});