// src/weather.js

export let widgetSunLights = [];

export function initPrecipitationEffect(type = 'rain') {
    const container = document.getElementById('precipitation-container');
    if (!container) return;
    container.innerHTML = '';
    
    const count = type === 'snow' ? 25 : 35;
    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = type === 'snow' ? 'snow-flake' : 'rain-drop';
        el.style.left = `${Math.random() * 100}%`;
        el.style.top = `${Math.random() * -50}px`;
        el.style.animationDelay = `${Math.random() * 2}s`;
        el.style.animationDuration = `${type === 'snow' ? (2 + Math.random() * 2) : (0.5 + Math.random() * 0.4)}s`;
        container.appendChild(el);
    }
}

export function getMoonPhaseAngle(dateObj) {
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    let c = 0;
    let y = year;
    let m = month;
    if (m < 3) { y--; m += 12; }
    let leap = Math.floor(y / 100);
    c = 2 - leap + Math.floor(leap / 4);
    let jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + c - 1524.5;
    let daysSinceNewMoon = jd - 2451549.5;
    let newMoons = daysSinceNewMoon / 29.53058885;
    let phaseFraction = newMoons - Math.floor(newMoons);
    return phaseFraction * 360;
}

// Автономный астрономический расчет восхода и заката на случай, если дата за пределами 16-дневного прогноза API
export function computeAstronomicalSunTimes(dateStr, lat = 55.7558, lon = 37.6173) {
    const d = dateStr ? new Date(dateStr) : new Date();
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = (d - start) + ((start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000);
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

    const rad = Math.PI / 180;
    const deg = 180 / Math.PI;

    // Склонение Солнца
    const declination = 23.45 * Math.sin(rad * (360 / 365) * (dayOfYear - 81));
    
    // Уравнение времени (в минутах)
    const B = rad * (360 / 365) * (dayOfYear - 81);
    const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

    // Часовой угол восхода/заката (зенитный угол 90.833 градуса)
    const cosOmega = (Math.cos(90.833 * rad) - Math.sin(lat * rad) * Math.sin(declination * rad)) / (Math.cos(lat * rad) * Math.cos(declination * rad));
    
    // Защита для полярного дня/ночи
    const clampedCos = Math.max(-1, Math.min(1, cosOmega));
    const omega = Math.acos(clampedCos) * deg;

    // Истинный солнечный полдень в минутах от полуночи (для UTC+3 Москва: часовой пояс = 3)
    const timezoneOffset = 3; 
    const solarNoonMins = 720 - (4 * lon) - eot + (timezoneOffset * 60);
    const halfDayMins = omega * 4;

    const riseMins = Math.round(solarNoonMins - halfDayMins);
    const setMins = Math.round(solarNoonMins + halfDayMins);

    function formatMins(m) {
        m = (m + 1440) % 1440;
        const h = Math.floor(m / 60);
        const min = Math.floor(m % 60);
        return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    }

    return {
        sunrise: formatMins(riseMins),
        sunset: formatMins(setMins)
    };
}

function createStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.15, 'rgba(220, 240, 255, 0.95)');
    gradient.addColorStop(0.4, 'rgba(120, 180, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
}

export function initWidgetMoon(containerElement) {
    if (!containerElement) return;
    containerElement.innerHTML = '';

    const sceneMoon = new THREE.Scene();
    const width = containerElement.clientWidth || 55;
    const height = containerElement.clientHeight || 55;
    const cameraMoon = new THREE.PerspectiveCamera(50, width / height, 0.1, 3000);
    cameraMoon.position.set(0, 0, 2.4);

    const rendererMoon = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", alpha: true });
    rendererMoon.setSize(width, height);
    rendererMoon.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerElement.appendChild(rendererMoon.domElement);

    const controlsMoon = new THREE.OrbitControls(cameraMoon, rendererMoon.domElement);
    controlsMoon.enableDamping = true;
    controlsMoon.dampingFactor = 0.04;
    controlsMoon.enableZoom = false;

    const starsCount = 2000;
    const starsGeo = new THREE.BufferGeometry();
    const starsPos = new Float32Array(starsCount * 3);
    const starsCols = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount * 3; i += 3) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 800 + Math.random() * 1000;

        starsPos[i]     = r * Math.sin(phi) * Math.cos(theta);
        starsPos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
        starsPos[i + 2] = r * Math.cos(phi);

        starsCols[i] = 1.0; starsCols[i+1] = 1.0; starsCols[i+2] = 1.0;
    }

    starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPos, 3));
    starsGeo.setAttribute('color', new THREE.BufferAttribute(starsCols, 3));

    const starsMat = new THREE.PointsMaterial({
        size: 5.0,
        vertexColors: true,
        map: createStarTexture(),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    sceneMoon.add(new THREE.Points(starsGeo, starsMat));

    const sphereGeo = new THREE.SphereGeometry(1, 64, 64);
    const moonMat = new THREE.MeshStandardMaterial({ 
        roughness: 0.9, 
        metalness: 0.1, 
        color: 0xcccccc 
    });
    const moonMesh = new THREE.Mesh(sphereGeo, moonMat);
    moonMesh.rotation.z = THREE.MathUtils.degToRad(1.54);
    sceneMoon.add(moonMesh);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');
    textureLoader.load(
        'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/moon_1024.jpg', 
        (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            moonMat.map = texture;
            moonMat.needsUpdate = true;
        },
        undefined,
        (err) => {
            console.warn('Не удалось загрузить текстуру луны, используется процедурный материал:', err);
        }
    );

    const sunLightMoon = new THREE.DirectionalLight(0xfff8ee, 2.2);
    sceneMoon.add(sunLightMoon);
    sceneMoon.add(new THREE.AmbientLight(0x1a2b4c, 0.4));

    widgetSunLights.push({ light: sunLightMoon, containerId: containerElement.id });
    updateSunLightPosition();

    const clock = new THREE.Clock();
    function animateMoon() {
        requestAnimationFrame(animateMoon);
        moonMesh.rotation.y = clock.getElapsedTime() * 0.02;
        controlsMoon.update();
        rendererMoon.render(sceneMoon, cameraMoon);
    }
    animateMoon();
}

export function updateSunLightPosition(overrideAngle = null) {
    const dateInputVal = document.getElementById('general-call-date')?.value || document.getElementById('meta-date-picker')?.value;
    const targetDate = dateInputVal ? new Date(dateInputVal) : new Date();
    let angleDeg = overrideAngle !== null ? overrideAngle : getMoonPhaseAngle(targetDate);
    
    const slider = document.getElementById('moon-phase-slider');
    if (slider && overrideAngle === null) {
        slider.value = Math.round(angleDeg);
    }

    const angleRad = THREE.MathUtils.degToRad(angleDeg);
    const distance = 8;

    widgetSunLights.forEach(item => {
        if (item.light) {
            item.light.position.x = Math.sin(angleRad) * distance;
            item.light.position.z = Math.cos(angleRad) * distance;
            item.light.position.y = 1.5;
        }
    });

    const phaseLabel = document.getElementById('phase-label');
    if (phaseLabel) {
        const normalized = ((angleDeg % 360) + 360) % 360;
        if (normalized < 15 || normalized > 345) phaseLabel.innerText = "Новолуние 🌑";
        else if (normalized < 90) phaseLabel.innerText = "Растущий серп 🌒";
        else if (normalized < 105) phaseLabel.innerText = "Первая четверть 🌓";
        else if (normalized < 180) phaseLabel.innerText = "Растущая луна 🌔";
        else if (normalized <= 195) phaseLabel.innerText = "Полнолуние 🌕";
        else if (normalized < 270) phaseLabel.innerText = "Убывающая луна 🌖";
        else if (normalized < 285) phaseLabel.innerText = "Последняя четверть 🌗";
        else phaseLabel.innerText = "Убывающий серп 🌘";
    }
}

document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'moon-phase-slider') {
        updateSunLightPosition(parseFloat(e.target.value));
    }
});

export function autoUpdateWeatherModeByTime(currentHour) {
    let targetMode = 'day';
    if (currentHour >= 18 && currentHour < 21) {
        targetMode = 'evening';
    } else if (currentHour >= 21 || currentHour < 6) {
        targetMode = 'night';
    } else {
        targetMode = 'day';
    }
    applyWeatherThemeVisuals(targetMode);
}

export function applyWeatherThemeVisuals(mode) {
    const banner = document.getElementById('cinematic-banner');
    const headerCelestial = document.getElementById('header-celestial-container');
    const bannerCelestial = document.getElementById('banner-celestial-container');
    const coronaBg = document.getElementById('corona-bg');
    const headerIconBox = document.getElementById('header-icon-box');
    const headerMainIcon = document.getElementById('header-main-icon');
    const bannerTitleText = document.getElementById('banner-title-text');
    const conditionMain = document.getElementById('condition-main');
    const moonControlsPanel = document.getElementById('moon-controls-panel');

    if (!banner) return;

    if (mode === 'day') {
        banner.className = "banner-day p-3.5 rounded-2xl border relative z-10 overflow-hidden mb-3 backdrop-blur-md transition-all duration-500";
        if (coronaBg) coronaBg.className = "absolute -top-10 -right-10 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl transition-all duration-500";
        if (headerIconBox) headerIconBox.className = "w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 text-sm shadow-inner transition-all duration-500";
        if (headerMainIcon) headerMainIcon.className = "fa-solid fa-cloud-sun";
        if (bannerTitleText) bannerTitleText.innerText = "Режимный свет / Золотой час";
        if (conditionMain) conditionMain.innerText = "Солнечно с плывущими объемными облаками";
        if (moonControlsPanel) moonControlsPanel.classList.add('hidden');

        if (headerCelestial) headerCelestial.innerHTML = '<div class="photorealistic-sun"></div>';
        if (bannerCelestial) bannerCelestial.innerHTML = '<div class="photorealistic-sun"></div>';

    } else if (mode === 'evening') {
        banner.className = "banner-day p-3.5 rounded-2xl border relative z-10 overflow-hidden mb-3 backdrop-blur-md transition-all duration-500";
        if (coronaBg) coronaBg.className = "absolute -top-10 -right-10 w-48 h-48 bg-orange-500/25 rounded-full blur-3xl transition-all duration-500";
        if (headerIconBox) headerIconBox.className = "w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/40 flex items-center justify-center text-orange-400 text-sm shadow-inner transition-all duration-500";
        if (headerMainIcon) headerMainIcon.className = "fa-solid fa-sunset";
        if (bannerTitleText) bannerTitleText.innerText = "Вечерний золотой час / Закат";
        if (conditionMain) conditionMain.innerText = "Режимное вечернее освещение, закат";
        if (moonControlsPanel) moonControlsPanel.classList.add('hidden');

        if (headerCelestial) headerCelestial.innerHTML = '<div class="photorealistic-sun" style="background: radial-gradient(circle, #f97316 0%, #c2410c 70%);"></div>';
        if (bannerCelestial) bannerCelestial.innerHTML = '<div class="photorealistic-sun" style="background: radial-gradient(circle, #f97316 0%, #c2410c 70%);"></div>';

    } else {
        banner.className = "banner-night p-3.5 rounded-2xl border relative z-10 overflow-hidden mb-3 backdrop-blur-md transition-all duration-500";
        if (coronaBg) coronaBg.className = "absolute -top-10 -right-10 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl transition-all duration-500";
        if (headerIconBox) headerIconBox.className = "w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/40 flex items-center justify-center text-indigo-300 text-sm shadow-inner transition-all duration-500";
        if (headerMainIcon) headerMainIcon.className = "fa-solid fa-cloud-moon";
        if (bannerTitleText) bannerTitleText.innerText = "Ночная смена / Натура";
        if (conditionMain) conditionMain.innerText = "Ясная ночь, лунное освещение";
        if (moonControlsPanel) moonControlsPanel.classList.remove('hidden');

        if (headerCelestial) headerCelestial.innerHTML = '<div class="moon-canvas-container" id="moon-header-3d"></div>';
        if (bannerCelestial) bannerCelestial.innerHTML = '<div class="moon-canvas-container" id="moon-banner-3d"></div>';

        widgetSunLights = [];
        setTimeout(() => {
            initWidgetMoon(document.getElementById('moon-header-3d'));
            initWidgetMoon(document.getElementById('moon-banner-3d'));
        }, 50);
    }
}

export function checkStormAlert(windSpeed) {
    const banner = document.getElementById('cinematic-banner');
    const titleText = document.getElementById('banner-title-text');
    const statusText = document.getElementById('cinematic-status-text');
    const alertIcon = document.getElementById('banner-alert-icon');
    if (!banner) return;

    if (windSpeed >= 10.0) {
        banner.className = "banner-danger p-3.5 rounded-2xl border relative z-10 overflow-hidden mb-3 backdrop-blur-md transition-all duration-500 animate-pulse";
        if (titleText) titleText.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1"></i> Штормовое предупреждение! (${windSpeed} м/с)`;
        if (statusText) statusText.innerText = "Внимание! Ветер превышает 10 м/с. Обязательный демонтаж рассеивателей, крепление ферм и фиксация тяжелых световых приборов!";
        if (alertIcon) alertIcon.className = "fa-solid fa-skull text-[10px] animate-spin";
    }
}

export async function fetchWeatherData(lat = 55.7558, lon = 37.6173) {
    const dateInputVal = document.getElementById('general-call-date')?.value || document.getElementById('meta-date-picker')?.value;
    const todayStr = new Date().toISOString().split('T')[0];
    const targetDate = dateInputVal || todayStr;

    // 1. Сначала мгновенно обновляем восход, закат и золотые часы по астрономической формуле для выбранной даты
    const astroTimes = computeAstronomicalSunTimes(targetDate, lat, lon);
    const sunRiseEl = document.getElementById('sun-rise');
    const sunSetEl = document.getElementById('sun-set');
    if (sunRiseEl) sunRiseEl.innerText = astroTimes.sunrise;
    if (sunSetEl) sunSetEl.innerText = astroTimes.sunset;
    calculateGoldenHours();

    // 2. Затем делаем запрос к метеосерверу Open-Meteo за точными данными погоды и астрономии
    try {
        let url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,surface_pressure,precipitation,weather_code&daily=sunrise,sunset,temperature_2m_max,apparent_temperature_max,wind_speed_10m_max,weather_code&timezone=Europe%2FMoscow`;
        
        if (targetDate) {
            url += `&start_date=${targetDate}&end_date=${targetDate}`;
        }

        const response = await fetch(url);
        if (!response.ok) return; // Если дата слишком далеко в будущем/прошлом, остаются астрономические расчеты из шага 1
        const data = await response.json();
        
        if (data && data.daily && data.daily.sunrise && data.daily.sunrise.length > 0) {
            const riseIso = data.daily.sunrise[0];
            const setIso = data.daily.sunset[0];
            if (riseIso && setIso) {
                const riseTime = riseIso.split('T')[1];
                const setTime = setIso.split('T')[1];
                if (sunRiseEl && riseTime) sunRiseEl.innerText = riseTime;
                if (sunSetEl && setTime) sunSetEl.innerText = setTime;
                calculateGoldenHours();
            }
        }

        if (data && data.current) {
            const isToday = (targetDate === todayStr);
            
            const temp = isToday ? Math.round(data.current.temperature_2m) : Math.round(data.daily?.temperature_2m_max?.[0] ?? data.current.temperature_2m);
            const appTemp = isToday ? Math.round(data.current.apparent_temperature) : Math.round(data.daily?.apparent_temperature_max?.[0] ?? data.current.apparent_temperature);
            const wind = isToday ? (data.current.wind_speed_10m || 6.9) : (data.daily?.wind_speed_10m_max?.[0] || data.current.wind_speed_10m);
            const humidity = data.current.relative_humidity_2m || 40;
            const pressure = data.current.surface_pressure ? Math.round(data.current.surface_pressure * 0.75006) : 761;
            const precipitation = data.current.precipitation || 0;
            const weatherCode = isToday ? (data.current.weather_code || 0) : (data.daily?.weather_code?.[0] ?? 0);

            const tempMain = document.getElementById('temp-main');
            const tempFeel = document.getElementById('temp-feel');
            const windVal = document.getElementById('wind-val');
            const humidityVal = document.getElementById('humidity-val');
            const pressureVal = document.getElementById('pressure-val');
            const conditionMain = document.getElementById('condition-main');

            const sign = temp > 0 ? '+' : '';
            const feelSign = appTemp > 0 ? '+' : '';

            if (tempMain) tempMain.innerText = `${sign}${temp}°C`;
            if (tempFeel) tempFeel.innerText = `Ощущается как ${feelSign}${appTemp}°`;
            if (windVal) windVal.innerText = `${wind} м/с`;
            if (humidityVal) humidityVal.innerText = `${humidity}%`;
            if (pressureVal) pressureVal.innerText = `${pressure} мм`;

            let conditionText = "Ясно и солнечно";
            let isRainingOrSnowing = false;

            if (weatherCode >= 50 && weatherCode <= 67) {
                conditionText = "Идет дождь";
                isRainingOrSnowing = true;
            } else if (weatherCode >= 70 && weatherCode <= 77) {
                conditionText = "Идет снег";
                isRainingOrSnowing = true;
            } else if (weatherCode >= 1 && weatherCode <= 3) {
                conditionText = "Облачно с прояснениями";
            } else if (precipitation > 0 && isToday) {
                conditionText = "Осадки";
                isRainingOrSnowing = true;
            }

            if (conditionMain) conditionMain.innerText = conditionText;

            const precipContainer = document.getElementById('precipitation-container');
            if (precipContainer) {
                if (isRainingOrSnowing) {
                    initPrecipitationEffect(temp <= 0 ? 'snow' : 'rain');
                } else {
                    precipContainer.innerHTML = '';
                }
            }

            checkStormAlert(wind);
        }
    } catch (err) {
        console.warn('Используются автономные астрономические данные для выбранной даты:', err);
    }
}

export function calculateGoldenHours() {
    const riseStr = document.getElementById('sun-rise')?.innerText.trim() || "07:25";
    const setStr = document.getElementById('sun-set')?.innerText.trim() || "17:01";

    function timeToMinutes(tStr) {
        const parts = tStr.split(':');
        if (parts.length !== 2) return 0;
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }

    function minutesToTime(mins) {
        mins = (mins + 1440) % 1440;
        const h = Math.floor(mins / 60);
        const m = Math.floor(mins % 60);
        return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    }

    const riseMins = timeToMinutes(riseStr);
    const setMins = timeToMinutes(setStr);

    const morningStart = riseMins;
    const morningEnd = riseMins + 60;
    const eveningStart = setMins - 60;
    const eveningEnd = setMins;

    const morningEl = document.getElementById('morning-golden-hour');
    const eveningEl = document.getElementById('evening-golden-hour');

    if (morningEl) morningEl.innerText = `${minutesToTime(morningStart)} - ${minutesToTime(morningEnd)}`;
    if (eveningEl) eveningEl.innerText = `${minutesToTime(eveningStart)} - ${minutesToTime(eveningEnd)}`;
}