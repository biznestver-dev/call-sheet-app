// src/map.js
import { venuesDatabase } from './data.js';
import { calculateGoldenHours, fetchWeatherData } from './weather.js';

let mapInstance = null;
let markerInstance = null;
let currentLat = 55.7618;
let currentLon = 37.6338;

export function initMiniMap(lat, lon, onLocationChange) {
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

export function showVenueDropdown(onSelectCallback) {
    renderVenueDropdown(venuesDatabase, onSelectCallback);
    document.getElementById('venue-dropdown-list')?.classList.remove('hidden');
}

export function filterVenues(query, onSelectCallback) {
    const q = query.toLowerCase();
    const filtered = venuesDatabase.filter(v => v.name.toLowerCase().includes(q) || v.address.toLowerCase().includes(q));
    renderVenueDropdown(filtered, onSelectCallback);
    document.getElementById('venue-dropdown-list')?.classList.remove('hidden');
}

function renderVenueDropdown(list, onSelectCallback) {
    const dropdown = document.getElementById('venue-dropdown-list');
    if (!dropdown) return;
    dropdown.innerHTML = '';
    if (list.length === 0) {
        dropdown.innerHTML = '<div class="p-2 text-xs text-slate-400">Нет в базе. Нажмите Enter для ввода своего адреса</div>';
        return;
    }
    list.forEach(v => {
        const item = document.createElement('div');
        item.className = "p-2 hover:bg-slate-800 cursor-pointer text-xs border-b border-slate-800 last:border-0";
        item.innerHTML = `<div class="font-bold text-white">${v.name}</div><div class="text-[10px] text-slate-400">${v.address}</div>`;
        item.onclick = () => {
            selectVenue(v);
            if (onSelectCallback) onSelectCallback(v);
        };
        dropdown.appendChild(item);
    });
}

export function selectVenue(v) {
    document.getElementById('location-name').innerText = v.name;
    document.getElementById('location-address').innerText = v.address;
    document.getElementById('location-metro').innerText = v.metro;
    document.getElementById('location-bus').innerText = v.bus;
    currentLat = v.lat;
    currentLon = v.lon;
    initMiniMap(currentLat, currentLon);
    document.getElementById('venue-dropdown-list')?.classList.add('hidden');
    const searchInput = document.getElementById('venue-search-input');
    if (searchInput) searchInput.value = '';
    calculateGoldenHours(currentLat, currentLon);
    fetchWeatherData(currentLat, currentLon);
}

export function handleCustomAddressKey(event) {
    if (event.key === 'Enter') {
        const customText = event.target.value.trim();
        if (customText) {
            document.getElementById('location-name').innerText = customText;
            document.getElementById('location-address').innerText = customText;
            document.getElementById('location-metro').innerText = "Произвольный адрес / Площадка";
            document.getElementById('location-bus').innerText = "Маршрут уточняется у координатора";
            document.getElementById('venue-dropdown-list')?.classList.add('hidden');
            event.target.value = '';
            initMiniMap(currentLat, currentLon);
            calculateGoldenHours(currentLat, currentLon);
        }
    }
}