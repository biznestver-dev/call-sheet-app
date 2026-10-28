// src/map.js
import { venuesDatabase } from './data.js';
import { fetchWeatherData } from './weather.js';

let mapInstance = null;
let markerInstance = null;
let currentLat = 55.7618;
let currentLon = 37.6338;

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

    // Автоматически обновляем погоду и астрономию для новой точки
    fetchWeatherData(currentLat, currentLon);
}

// Умный поиск координат по произвольному тексту через Nominatim API при нажатии Enter
export async function handleCustomAddressKey(event) {
    if (event.key === 'Enter') {
        const customText = event.target.value.trim();
        if (!customText) return;

        document.getElementById('venue-dropdown-list')?.classList.add('hidden');
        document.getElementById('location-name').innerText = customText;
        document.getElementById('location-address').innerText = "Поиск координат на карте...";

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(customText)}&limit=1`, {
                headers: { 'Accept-Language': 'ru' }
            });
            const results = await res.json();

            if (results && results.length > 0) {
                currentLat = parseFloat(results[0].lat);
                currentLon = parseFloat(results[0].lon);
                const fullName = results[0].display_name || customText;

                document.getElementById('location-address').innerText = fullName;
                document.getElementById('location-metro').innerText = "Адрес найден по OSM геокодеру";
                document.getElementById('location-bus').innerText = "Подъезд автотранспорта";

                initMiniMap(currentLat, currentLon);
                fetchWeatherData(currentLat, currentLon);
            } else {
                document.getElementById('location-address').innerText = customText;
                document.getElementById('location-metro').innerText = "Координаты не найдены (оставлена текущая точка)";
            }
        } catch (err) {
            console.error('Ошибка геокодирования адреса:', err);
            document.getElementById('location-address').innerText = customText;
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