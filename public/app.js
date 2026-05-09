const DATA_URL = './data.json';
const POLL_INTERVAL = 60000; // 60 seconds

let lastData = null;

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
    // Summary
    document.getElementById('progress-val').textContent = `${data.routeProgressPercent}%`;
    document.getElementById('progress-bar').style.width = `${data.routeProgressPercent}%`;
    document.getElementById('reached-count').textContent = `${data.reachedCount} / ${data.checkpoints.length}`;
    document.getElementById('source-update').textContent = data.sourceLastUpdated;
    
    const lastCp = data.currentCheckpoint;
    const nextCp = data.nextCheckpoint;

    // Highlights
    if (lastCp) {
        document.getElementById('current-cp-name').textContent = lastCp.name;
        document.getElementById('current-cp-time').textContent = lastCp.arrivalTime || '--:--';
        document.getElementById('current-cp-elapsed').textContent = lastCp.elapsed ? lastCp.elapsed.label : '--';
    }

    if (nextCp) {
        document.getElementById('next-cp-name').textContent = nextCp.name;
        document.getElementById('next-cp-progress').textContent = `${nextCp.progressPercent}%`;
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
            <span class="timeline-name">${cp.name}</span>
            <span class="timeline-time">${cp.arrivalTime || '-'}</span>
        `;
        timeline.appendChild(item);
    });

    // Checkpoint Cards
    const grid = document.getElementById('checkpoint-grid');
    grid.innerHTML = '';
    data.checkpoints.forEach(cp => {
        const card = document.createElement('div');
        card.className = `cp-card ${cp.reached ? 'reached' : 'unreached'}`;
        card.innerHTML = `
            <img src="${cp.localImageUrl}" alt="${cp.name}" class="cp-card-img" onerror="this.src='https://via.placeholder.com/300x150?text=${cp.name}'">
            <div class="cp-card-content">
                <h3>${cp.name}</h3>
                <p>${cp.arrivalTime ? 'Arrived: ' + cp.arrivalTime : 'Not yet reached'}</p>
                ${cp.elapsed ? `<p>Elapsed: ${cp.elapsed.label}</p>` : ''}
            </div>
        `;
        grid.appendChild(card);
    });

    // Map
    renderMap(data.checkpoints, lastCp);
}

function renderMap(checkpoints, currentCp) {
    const svg = document.getElementById('route-map');
    svg.innerHTML = '';

    // Projection constants (Dartmoor bounds)
    const minLat = 50.55, maxLat = 50.75;
    const minLon = -4.1, maxLon = -3.85;

    function project(lat, lon) {
        const x = ((lon - minLon) / (maxLon - minLon)) * 100;
        const y = 100 - ((lat - minLat) / (maxLat - minLat)) * 100;
        return { x, y };
    }

    // Draw route line
    let pathData = '';
    checkpoints.forEach((cp, i) => {
        if (cp.coordinates) {
            const { x, y } = project(cp.coordinates.lat, cp.coordinates.lon);
            pathData += (i === 0 ? 'M' : 'L') + `${x},${y} `;
        }
    });

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('class', 'route-path');
    svg.appendChild(path);

    // Draw dots
    checkpoints.forEach(cp => {
        if (cp.coordinates) {
            const { x, y } = project(cp.coordinates.lat, cp.coordinates.lon);
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', x);
            dot.setAttribute('cy', y);
            dot.setAttribute('r', '2');
            let className = 'checkpoint-dot';
            if (cp.reached) className += ' reached';
            if (currentCp && cp.name === currentCp.name) className += ' current';
            dot.setAttribute('class', className);
            
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = cp.name;
            dot.appendChild(title);
            
            svg.appendChild(dot);
        }
    });
}

function showError() {
    document.getElementById('error-toast').classList.remove('hidden');
}

function hideError() {
    document.getElementById('error-toast').classList.add('hidden');
}

// Initial fetch
fetchData();

// Poll
setInterval(fetchData, POLL_INTERVAL);
