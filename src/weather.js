// src/weather.js

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

export function calculateSunTimesForDate(dateObj, lat, lon) {
    const doy = (Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()) - Date.UTC(dateObj.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000;
    const rad = Math.PI / 180;
    const decl = 23.44 * Math.sin(rad * (360 * (doy - 81) / 365));
    const latRad = lat * rad;
    const declRad = decl * rad;
    const cosH = -Math.tan(latRad) * Math.tan(declRad);
    
    let H = 6;
    if (cosH >= -1 && cosH <= 1) {
        H = Math.acos(cosH) / (rad * 15);
    } else if (cosH > 1) {
        H = 0;
    } else {
        H = 12;
    }

    const tzOffset = 3; 
    const solarTransit = 12 - (lon / 15) + tzOffset;
    
    let riseDecimal = solarTransit - H;
    let setDecimal = solarTransit + H;

    function decimalToTime(dec) {
        let norm = (dec + 24) % 24;
        let h = Math.floor(norm);
        let m = Math.floor((norm - h) * 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    return {
        rise: decimalToTime(riseDecimal),
        set: decimalToTime(setDecimal)
    };
}

export function calculateGoldenHours(currentLat, currentLon) {
    const dateInputVal = document.getElementById('meta-date-picker')?.value;
    const targetDate = dateInputVal ? new Date(dateInputVal) : new Date();
    
    const sunTimes = calculateSunTimesForDate(targetDate, currentLat, currentLon);
    const sunRiseEl = document.getElementById('sun-rise');
    const sunSetEl = document.getElementById('sun-set');

    if (sunRiseEl) sunRiseEl.innerText = sunTimes.rise;
    if (sunSetEl) sunSetEl.innerText = sunTimes.set;

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

    const riseMins = timeToMinutes(sunTimes.rise);
    const setMins = timeToMinutes(sunTimes.set);

    const morningStart = riseMins;
    const morningEnd = riseMins + 60;
    const eveningStart = setMins - 60;
    const eveningEnd = setMins;

    const morningEl = document.getElementById('morning-golden-hour');
    const eveningEl = document.getElementById('evening-golden-hour');

    if (morningEl) morningEl.innerText = `${minutesToTime(morningStart)} - ${minutesToTime(morningEnd)}`;
    if (eveningEl) eveningEl.innerText = `${minutesToTime(eveningStart)} - ${minutesToTime(eveningEnd)}`;
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
        if (statusText) statusText.innerText = "Внимание! Ветер превышает 10 м/с. Обязательный демонтаж рассеивателей и фиксация приборов!";
        if (alertIcon) alertIcon.className = "fa-solid fa-skull text-[10px] animate-spin";
    }
}

export async function fetchWeatherData(currentLat, currentLon) {
    try {
        const dateInputVal = document.getElementById('meta-date-picker')?.value;
        const targetDateStr = dateInputVal || new Date().toISOString().split('T')[0];

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${currentLat}&longitude=${currentLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,surface_pressure,precipitation,weather_code&start_date=${targetDateStr}&end_date=${targetDateStr}&timezone=Europe%2FMoscow`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        let curTemp = +7;
        let curAppTemp = +3;
        let curWind = 6.9;
        let curHum = 40;
        let curPress = 761;
        let curPrecip = 0;
        let curCode = 0;

        if (data && data.current) {
            curTemp = Math.round(data.current.temperature_2m);
            curAppTemp = Math.round(data.current.apparent_temperature);
            curWind = data.current.wind_speed_10m || 6.9;
            curHum = data.current.relative_humidity_2m || 40;
            curPress = data.current.surface_pressure ? Math.round(data.current.surface_pressure * 0.75006) : 761;
            curPrecip = data.current.precipitation || 0;
            curCode = data.current.weather_code || 0;
        }

        const tempMain = document.getElementById('temp-main');
        const tempFeel = document.getElementById('temp-feel');
        const windVal = document.getElementById('wind-val');
        const humidityVal = document.getElementById('humidity-val');
        const pressureVal = document.getElementById('pressure-val');
        const conditionMain = document.getElementById('condition-main');

        if (tempMain) tempMain.innerText = `+${curTemp}°C`;
        if (tempFeel) tempFeel.innerText = `Ощущается как +${curAppTemp}°`;
        if (windVal) windVal.innerText = `${curWind} м/с`;
        if (humidityVal) humidityVal.innerText = `${curHum}%`;
        if (pressureVal) pressureVal.innerText = `${curPress} мм`;

        let conditionText = "Ясно и солнечно";
        let isRainingOrSnowing = false;

        if (curCode >= 50 && curCode <= 67) {
            conditionText = "Идет дождь";
            isRainingOrSnowing = true;
        } else if (curCode >= 70 && curCode <= 77) {
            conditionText = "Идет снег";
            isRainingOrSnowing = true;
        } else if (curPrecip > 0) {
            conditionText = "Осадки";
            isRainingOrSnowing = true;
        }

        if (conditionMain) conditionMain.innerText = conditionText;

        const precipContainer = document.getElementById('precipitation-container');
        if (precipContainer) {
            if (isRainingOrSnowing) {
                initPrecipitationEffect(curTemp <= 0 ? 'snow' : 'rain');
            } else {
                precipContainer.innerHTML = '';
            }
        }

        checkStormAlert(curWind);
    } catch (err) {
        console.error('Ошибка получения погоды:', err);
    }
}