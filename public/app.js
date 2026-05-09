const DATA_URL = './data.json';
const POLL_INTERVAL = 60000;

let lastData = null;
let map = null;
let routeLine = null;
let markers = [];

// Initialize Map
function initMap() {
    if (map) return;
    map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView([50.65, -3.98], 11);

    L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17
    }).addTo(map);
}

function updateMap(checkpoints, currentCp) {
    if (!map) initMap();

    // Clear old markers
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    if (routeLine) map.removeLayer(routeLine);

    const latlngs = checkpoints
        .filter(cp => cp.coordinates)
        .map(cp => [cp.coordinates.lat, cp.coordinates.lon]);

    if (latlngs.length > 0) {
        routeLine = L.polyline(latlngs, {
            color: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
            weight: 6,
            opacity: 0.9,
            dashArray: '1, 10'
        }).addTo(map);

        checkpoints.forEach(cp => {
            if (!cp.coordinates) return;
            const isCurrent = currentCp && cp.name === currentCp.name;
            const isReached = cp.reached;
            
            const marker = L.circleMarker([cp.coordinates.lat, cp.coordinates.lon], {
                radius: isCurrent ? 10 : 4,
                fillColor: isCurrent ? '#4ade80' : (isReached ? '#fbbf24' : '#000'),
                color: isCurrent ? '#4ade80' : '#78866b',
                weight: isCurrent ? 2 : 1,
                opacity: 1,
                fillOpacity: 1,
                className: isCurrent ? 'current-cp-marker' : ''
            }).addTo(map).bindPopup(cp.name);
            
            markers.push(marker);
        });

        // Fit bounds on first load or significant change
        if (markers.length > 0 && !lastData) {
            map.fitBounds(routeLine.getBounds(), { padding: [20, 20] });
        }
    }
}

async function fetchData() {
    try {
        const response = await fetch(DATA_URL + '?t=' + Date.now());
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        renderDashboard(data);
        hideError();
        lastData = data;
    } catch (error) {
        console.error('Fetch error:', error);
        showError();
        if (lastData) renderDashboard(lastData);
    } finally {
        document.getElementById('last-refresh').textContent = new Date().toLocaleTimeString();
    }
}

function renderDashboard(data) {
    document.getElementById('progress-val').textContent = `${data.routeProgressPercent}%`;
    document.getElementById('progress-bar').style.width = `${data.routeProgressPercent}%`;
    document.getElementById('reached-count').textContent = `${data.reachedCount} / ${data.checkpoints.length}`;
    document.getElementById('source-update').textContent = data.sourceLastUpdated;
    
    const lastCp = data.currentCheckpoint;
    const nextCp = data.nextCheckpoint;

    if (lastCp) {
        document.getElementById('current-cp-name').textContent = lastCp.name;
        document.getElementById('current-cp-time').textContent = lastCp.arrivalTime || '--:--';
        document.getElementById('current-cp-elapsed').textContent = lastCp.elapsed ? lastCp.elapsed.label : '--';
    }

    if (nextCp) {
        document.getElementById('next-cp-name').textContent = nextCp.name;
        document.getElementById('next-cp-eta').textContent = nextCp.eta || '--:--';
        document.getElementById('team-pace').textContent = nextCp.pace ? `${nextCp.pace} min/km` : '-- min/km';
    }

    // Timeline
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = '';
    data.checkpoints.forEach(cp => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        if (cp.reached) item.classList.add('reached');
        if (lastCp && cp.name === lastCp.name) item.classList.add('current');
        item.innerHTML = `
            <div class="timeline-marker"></div>
            <span class="timeline-name mono">${cp.name}</span>
            <span class="timeline-time mono">${cp.arrivalTime || '-'}</span>
        `;
        timeline.appendChild(item);
    });

    // Checkpoint Cards
    const grid = document.getElementById('checkpoint-grid');
    grid.innerHTML = '';
    data.checkpoints.forEach(cp => {
        const card = document.createElement('div');
        const isSatellite = !cp.localImageUrl.includes('cosdon') && !cp.localImageUrl.includes('postbridge');
        card.className = `cp-card ${cp.reached ? 'reached' : 'unreached'} ${isSatellite ? 'sat-view' : ''}`;
        card.innerHTML = `
            <div class="card-img-wrapper">
                <img src="${cp.localImageUrl}" alt="${cp.name}" class="cp-card-img" onerror="this.src='https://via.placeholder.com/300x150?text=${cp.name}'">
                ${isSatellite ? '<div class="sat-overlay">ZOOM_LVL: 18 // SAT_LINK</div>' : ''}
            </div>
            <div class="cp-card-content">
                <h3 class="mono">${cp.name}</h3>
                <p class="mono">${cp.arrivalTime ? 'ACQ: ' + cp.arrivalTime : 'STATUS: PENDING'}</p>
                ${cp.elapsed ? `<p class="mono">ELAPSED: ${cp.elapsed.label}</p>` : ''}
                <p class="mono meta">COORD: ${cp.coordinates ? cp.coordinates.lat.toFixed(4) + ',' + cp.coordinates.lon.toFixed(4) : 'UNKNOWN'}</p>
            </div>
        `;
        grid.appendChild(card);
    });

    updateMap(data.checkpoints, lastCp);
}

// UI Toggles
document.getElementById('toggle-theme').addEventListener('click', () => {
    document.body.classList.toggle('sunlight-mode');
    const isSun = document.body.classList.contains('sunlight-mode');
    document.getElementById('toggle-theme').textContent = isSun ? 'TACTICAL MODE' : 'SUNLIGHT MODE';
});

document.getElementById('toggle-map-style').addEventListener('click', () => {
    const filters = [
        'grayscale(1) invert(1) opacity(0.5) contrast(1.5) sepia(1) hue-rotate(60deg)', // HUD
        'none' // Standard
    ];
    const mapEl = document.querySelector('.leaflet-tile-pane');
    const currentFilter = mapEl.style.filter;
    mapEl.style.filter = currentFilter === filters[0] ? filters[1] : filters[0];
});

function showError() {
    document.getElementById('error-toast').classList.remove('hidden');
}

function hideError() {
    document.getElementById('error-toast').classList.add('hidden');
}

// Initial fetch
fetchData();
setInterval(fetchData, POLL_INTERVAL);
