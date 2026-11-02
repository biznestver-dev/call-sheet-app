// src/map.js
import { venuesDatabase } from './data.js';
import { fetchWeatherData } from './weather.js';

let mapInstance = null;
let markerInstance = null;
let currentLat = 55.7618;
let currentLon = 37.6338;
let transportLookupId = 0;

function notifyLocationUpdated(lat, lon) {
    window.dispatchEvent(new CustomEvent('call-sheet-location-updated', {
        detail: { lat, lon }
    }));
}

function distanceInMeters(lat1, lon1, lat2, lon2) {
    const radians = value => value * Math.PI / 180;
    const earthRadius = 6371000;
    const dLat = radians(lat2 - lat1);
    const dLon = radians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatNearbyStops(stops, mode) {
    const nearby = stops
        .filter(stop => stop.mode === mode)
        .slice(0, 3)
        .map(stop => {
            const distance = stop.distance < 100
                ? `${Math.round(stop.distance)} м`
                : stop.distance < 1000
                    ? `${Math.round(stop.distance / 10) * 10} м`
                    : `${(stop.distance / 1000).toFixed(1)} км`;
            return `${stop.name} — ${distance}`;
        });
    return nearby.length ? nearby.join('\n') : 'Не найдено в радиусе 1 км';
}

export async function updateNearbyTransport(lat, lon) {
    const metro = document.getElementById('location-metro');
    const bus = document.getElementById('location-bus');
    const lookupId = ++transportLookupId;
    if (metro) metro.innerText = 'Ищем ближайшие станции…';
    if (bus) bus.innerText = 'Ищем ближайшие остановки…';

    const query = `[out:json][timeout:10];(
      nwr(around:1000,${lat},${lon})["highway"="bus_stop"];
      nwr(around:1000,${lat},${lon})["public_transport"="platform"]["name"];
      nwr(around:1000,${lat},${lon})["railway"~"^(station|tram_stop|halt)$"];
      nwr(around:1000,${lat},${lon})["station"="subway"];
      nwr(around:1000,${lat},${lon})["subway"="yes"];
    );out center tags;`;

    try {
        let data;
        let lastError;
        for (const endpoint of [
            'https://overpass-api.de/api/interpreter',
            'https://overpass.kumi.systems/api/interpreter'
        ]) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
                    body: `data=${encodeURIComponent(query)}`,
                    signal: AbortSignal.timeout(12000)
                });
                if (!response.ok) throw new Error(`Overpass API returned ${response.status}`);
                data = await response.json();
                if (!Array.isArray(data.elements)) throw new Error('Overpass API returned invalid data');
                break;
            } catch (error) {
                lastError = error;
            }
        }
        if (!data) throw lastError || new Error('No Overpass API endpoint is available');
        if (lookupId !== transportLookupId) return;

        const stops = (data.elements || []).flatMap(element => {
            const tags = element.tags || {};
            const name = tags.name || tags['name:ru'];
            if (!name) return [];

            const point = element.type === 'node' ? element : element.center;
            if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lon)) return [];

            const isBus = tags.highway === 'bus_stop' ||
                tags.bus === 'yes' ||
                tags.public_transport === 'platform' && tags.bus !== 'no' && !tags.tram;
            const isTram = tags.railway === 'tram_stop' ||
                tags.tram === 'yes' ||
                tags.public_transport === 'platform' && tags.tram === 'yes';
            const isRail = tags.station === 'subway' ||
                tags.subway === 'yes' ||
                tags.railway === 'station' ||
                tags.railway === 'halt';
            const mode = isRail ? 'rail' : isTram ? 'tram' : isBus ? 'bus' : null;
            if (!mode) return [];

            return [{
                name,
                mode,
                distance: distanceInMeters(lat, lon, point.lat, point.lon)
            }];
        }).sort((a, b) => a.distance - b.distance);

        const railAndTram = [
            formatNearbyStops(stops, 'rail'),
            formatNearbyStops(stops, 'tram')
        ].filter(value => value !== 'Не найдено в радиусе 1 км').join('; ');
        if (metro) metro.innerText = railAndTram || 'Метро, электрички и трамваи не найдены в радиусе 1 км';
        if (bus) bus.innerText = formatNearbyStops(stops, 'bus');
        notifyLocationUpdated(lat, lon);
    } catch (error) {
        if (lookupId !== transportLookupId) return;
        console.error('Не удалось загрузить остановки общественного транспорта:', error);
        if (metro) metro.innerText = 'Сервис транспорта временно недоступен';
        if (bus) bus.innerText = 'Попробуйте обновить данные позже';
    }
}

export function initMiniMap(lat, lon) {
    currentLat = lat || 55.7618;
    currentLon = lon || 37.6338;

    const container = document.getElementById('miniMap');
    if (!container) return;

    setTimeout(() => {
        if (!mapInstance) {
            mapInstance = L.map('miniMap', { zoomControl: false, attributionControl: false }).setView([currentLat, currentLon], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapInstance);
            markerInstance = L.marker([currentLat, currentLon]).addTo(mapInstance);
        } else {
            mapInstance.setView([currentLat, currentLon], 15);
            markerInstance.setLatLng([currentLat, currentLon]);
        }
        mapInstance.invalidateSize();
    }, 300);
}

export function openMapRoute() {
    const address = document.getElementById('location-address')?.innerText || '';
    const name = document.getElementById('location-name')?.innerText || '';
    const query = encodeURIComponent(`${name}, ${address}`);
    window.open(`https://yandex.ru/maps/?text=${query}`, '_blank');
}

export function showVenueDropdown() {
    renderVenueDropdown(venuesDatabase);
    document.getElementById('venue-dropdown-list')?.classList.remove('hidden');
}

export function filterVenues(query) {
    const q = query.toLowerCase();
    const filtered = venuesDatabase.filter(v => v.name.toLowerCase().includes(q) || v.address.toLowerCase().includes(q));
    renderVenueDropdown(filtered);
    document.getElementById('venue-dropdown-list')?.classList.remove('hidden');
}

function renderVenueDropdown(list) {
    const dropdown = document.getElementById('venue-dropdown-list');
    if (!dropdown) return;
    dropdown.innerHTML = '';
    if (list.length === 0) {
        dropdown.innerHTML = '<div class="p-2 text-xs text-slate-400">Нет в базе. Нажмите Enter, чтобы найти адрес на карте</div>';
        return;
    }
    list.forEach(v => {
        const item = document.createElement('div');
        item.className = "p-2 hover:bg-slate-800 cursor-pointer text-xs border-b border-slate-800 last:border-0";
        item.innerHTML = `<div class="font-bold text-white">${v.name}</div><div class="text-[10px] text-slate-400">${v.address}</div>`;
        item.onclick = () => selectVenue(v);
        dropdown.appendChild(item);
    });
}

export function selectVenue(v) {
    document.getElementById('location-name').innerText = v.name;
    document.getElementById('location-address').innerText = v.address;
    document.getElementById('location-metro').innerText = v.metro || "Выбрано из базы";
    document.getElementById('location-bus').innerText = v.bus || "Транспортная доступность";
    currentLat = v.lat;
    currentLon = v.lon;
    initMiniMap(currentLat, currentLon);
    document.getElementById('venue-dropdown-list')?.classList.add('hidden');
    const searchInput = document.getElementById('venue-search-input');
    if (searchInput) searchInput.value = '';

    fetchWeatherData(currentLat, currentLon);
    updateNearbyTransport(currentLat, currentLon);
    notifyLocationUpdated(currentLat, currentLon);
}

// Умный поиск координат (с запасным вариантом поиска по улице/населенному пункту)
export async function handleCustomAddressKey(event) {
    if (event.key === 'Enter') {
        const customText = event.target.value.trim();
        if (!customText) return;

        document.getElementById('venue-dropdown-list')?.classList.add('hidden');
        document.getElementById('location-name').innerText = customText;
        document.getElementById('location-address').innerText = "Поиск координат на карте...";
        document.getElementById('location-metro').innerText = "Определяем координаты адреса…";
        document.getElementById('location-bus').innerText = "Остановки появятся после поиска адреса";

        async function tryGeocode(query) {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
                headers: { 'Accept-Language': 'ru' }
            });
            return await res.json();
        }

        try {
            // Попытка №1: ищем полный введенный адрес
            let results = await tryGeocode(customText);

            // Попытка №2: если дом не найден, отрезаем первую часть (номер дома) и ищем саму улицу/деревню
            if ((!results || results.length === 0) && customText.includes(',')) {
                const parts = customText.split(',').map(p => p.trim());
                if (parts.length > 1) {
                    parts.shift();
                    const fallbackQuery = parts.join(', ');
                    results = await tryGeocode(fallbackQuery);
                }
            }

            if (results && results.length > 0) {
                currentLat = parseFloat(results[0].lat);
                currentLon = parseFloat(results[0].lon);
                const fullName = results[0].display_name || customText;

                document.getElementById('location-address').innerText = fullName;

                initMiniMap(currentLat, currentLon);
                fetchWeatherData(currentLat, currentLon);
                updateNearbyTransport(currentLat, currentLon);
                notifyLocationUpdated(currentLat, currentLon);
            } else {
                document.getElementById('location-address').innerText = customText;
                document.getElementById('location-metro').innerText = "Не удалось определить координаты адреса";
                document.getElementById('location-bus').innerText = "Проверьте адрес и попробуйте ещё раз";
            }
        } catch (err) {
            console.error('Ошибка геокодирования адреса:', err);
            document.getElementById('location-address').innerText = customText;
            document.getElementById('location-metro').innerText = "Не удалось определить координаты адреса";
            document.getElementById('location-bus').innerText = "Проверьте подключение и попробуйте ещё раз";
        }

        event.target.value = '';
    }
}

// Автоматическое определение геолокации устройства по GPS
export function detectUserLocation(onSuccessCallback) {
    if (!navigator.geolocation) {
        alert('Геолокация не поддерживается вашим браузером');
        return;
    }

    const btnIcon = document.querySelector('.fa-location-crosshairs');
    if (btnIcon) btnIcon.classList.add('fa-spin');

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            if (btnIcon) btnIcon.classList.remove('fa-spin');
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            let placeName = `GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
            let placeAddress = "Определено по GPS устройства";
            
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`, {
                    headers: { 'Accept-Language': 'ru' }
                });
                const data = await res.json();
                if (data && data.display_name) {
                    placeName = data.address?.city || data.address?.town || data.address?.village || "Съемочная площадка (GPS)";
                    placeAddress = data.display_name;
                }
            } catch (err) {
                console.warn('Не удалось расшифровать адрес по координатам:', err);
            }

            document.getElementById('location-name').innerText = placeName;
            document.getElementById('location-address').innerText = placeAddress;
            document.getElementById('location-metro').innerText = "Точка по GPS-координатам";
            document.getElementById('location-bus').innerText = "Наземный подъезд";

            currentLat = lat;
            currentLon = lon;
            initMiniMap(lat, lon);
            updateNearbyTransport(lat, lon);
            notifyLocationUpdated(lat, lon);
            
            if (onSuccessCallback) onSuccessCallback(lat, lon);
        },
        (error) => {
            if (btnIcon) btnIcon.classList.remove('fa-spin');
            console.error('Ошибка геолокации:', error);
            alert('Не удалось получить геопозицию. Проверьте разрешения браузера.');
        },
        { timeout: 10000, enableHighAccuracy: true }
    );
}