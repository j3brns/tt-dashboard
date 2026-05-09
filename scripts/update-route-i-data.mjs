import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

const ROUTE_URL = 'https://www.tentors.org.uk/eventdata/routei.html';
const TEAM_CODE = 'IF';
const TEAM_NAME = 'Polar Explorer Scouts';
const OUTPUT_FILE = path.join(process.cwd(), 'public', 'data.json');
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');

const CHECKPOINTS = [
  "START", "HIGHER TOR", "COSDON HILL", "SHILSTONE TOR", "STEEPERTON TOR",
  "WATERN TOR", "SITTAFORD TOR", "STANNON TOR", "POSTBRIDGE", "HIGHER WHITE TOR",
  "HOLMING BEAM", "WHITE BARROW", "STANDON FARM", "WILLSWORTHY", "HARE TOR",
  "KITTY TOR", "EAST MILL TOR", "FINISH"
];

// Provide some approximate coordinates (not navigation-grade)
const CHECKPOINT_COORDS = {
  "START": { lat: 50.738, lon: -4.008 },
  "HIGHER TOR": { lat: 50.716, lon: -3.987 },
  "COSDON HILL": { lat: 50.711, lon: -3.921 },
  "SHILSTONE TOR": { lat: 50.686, lon: -3.896 },
  "STEEPERTON TOR": { lat: 50.672, lon: -3.974 },
  "WATERN TOR": { lat: 50.655, lon: -3.957 },
  "SITTAFORD TOR": { lat: 50.638, lon: -3.963 },
  "STANNON TOR": { lat: 50.630, lon: -3.929 },
  "POSTBRIDGE": { lat: 50.595, lon: -3.906 },
  "HIGHER WHITE TOR": { lat: 50.589, lon: -3.974 },
  "HOLMING BEAM": { lat: 50.573, lon: -3.993 },
  "WHITE BARROW": { lat: 50.5757, lon: -4.0459 },
  "STANDON FARM": { lat: 50.605, lon: -4.053 },
  "WILLSWORTHY": { lat: 50.628, lon: -4.072 },
  "HARE TOR": { lat: 50.643, lon: -4.053 },
  "KITTY TOR": { lat: 50.671, lon: -4.043 },
  "EAST MILL TOR": { lat: 50.704, lon: -4.004 },
  "FINISH": { lat: 50.738, lon: -4.008 }
};

// Approximate distances in km between sequential checkpoints
const SEGMENT_DISTANCES = {
  "START-HIGHER TOR": 2.8,
  "HIGHER TOR-COSDON HILL": 4.5,
  "COSDON HILL-SHILSTONE TOR": 3.2,
  "SHILSTONE TOR-STEEPERTON TOR": 5.8,
  "STEEPERTON TOR-WATERN TOR": 2.1,
  "WATERN TOR-SITTAFORD TOR": 2.0,
  "SITTAFORD TOR-STANNON TOR": 2.5,
  "STANNON TOR-POSTBRIDGE": 4.2,
  "POSTBRIDGE-HIGHER WHITE TOR": 4.8,
  "HIGHER WHITE TOR-HOLMING BEAM": 2.2,
  "HOLMING BEAM-WHITE BARROW": 3.8,
  "WHITE BARROW-STANDON FARM": 3.5,
  "STANDON FARM-WILLSWORTHY": 2.9,
  "WILLSWORTHY-HARE TOR": 2.1,
  "HARE TOR-KITTY TOR": 3.2,
  "KITTY TOR-EAST MILL TOR": 4.5,
  "EAST MILL TOR-FINISH": 4.0
};

async function fetchRouteData() {
  const res = await fetch(ROUTE_URL);
  if (!res.ok) throw new Error(`Failed to fetch ${ROUTE_URL}: ${res.status}`);
  const html = await res.text();
  return cheerio.load(html);
}

function parseTime(timeStr) {
  if (!timeStr || !timeStr.match(/^\d{2}:\d{2}$/)) return null;
  return timeStr;
}

function calculateElapsedMinutes(startStr, endStr) {
  if (!startStr || !endStr) return null;
  const [h1, m1] = startStr.split(':').map(Number);
  const [h2, m2] = endStr.split(':').map(Number);
  // Simplistic assumption: if end hour < start hour, it's the next day
  let diffH = h2 - h1;
  if (diffH < 0) diffH += 24;
  return diffH * 60 + (m2 - m1);
}

function formatElapsed(minutes) {
  if (minutes == null) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

async function ensureImages(forceRefresh) {
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
  
  const extensions = ['.webp', '.png', '.jpg', '.jpeg'];
  
  for (const cp of CHECKPOINTS) {
    const slug = cp.toLowerCase().replace(/\s+/g, '-');
    
    // Check if a real photo already exists
    let photoFound = null;
    for (const ext of extensions) {
      if (fs.existsSync(path.join(IMAGES_DIR, `${slug}${ext}`))) {
        photoFound = `./images/${slug}${ext}`;
        break;
      }
    }

    const svgPath = path.join(IMAGES_DIR, `${slug}.svg`);
    
    // If no real photo and (force or no SVG), generate tactical SVG
    if (!photoFound && (forceRefresh || !fs.existsSync(svgPath))) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
        <rect width="100%" height="100%" fill="#1a1e17" />
        <path d="M0 0 L20 0 M0 0 L0 20" stroke="#78866b" stroke-width="2" />
        <path d="M380 0 L400 0 M400 0 L400 20" stroke="#78866b" stroke-width="2" />
        <path d="M0 280 L0 300 M0 300 L20 300" stroke="#78866b" stroke-width="2" />
        <path d="M380 300 L400 300 M400 300 L400 280" stroke="#78866b" stroke-width="2" />
        <text x="50%" y="45%" font-family="monospace" font-size="18" fill="#fbbf24" text-anchor="middle" font-weight="bold">${cp}</text>
        <text x="50%" y="58%" font-family="monospace" font-size="10" fill="#78866b" text-anchor="middle">COORD_DATA: ACQUIRING...</text>
        <circle cx="200" cy="200" r="40" fill="none" stroke="#78866b" stroke-width="1" opacity="0.2" />
        <path d="M160 200 L240 200 M200 160 L200 240" stroke="#78866b" stroke-width="1" opacity="0.2" />
      </svg>`;
      fs.writeFileSync(svgPath, svg);
    }
  }
}

const EVENT_WINDOW = {
  start: '2026-05-09T06:00:00Z',
  end: '2026-05-10T18:00:00Z'
};

async function updateData() {
  const args = process.argv.slice(2);
  const forceImageRefresh = args.includes('--force-images');
  const ignoreWindow = args.includes('--ignore-window');

  const now = new Date();
  if (!ignoreWindow && (now < new Date(EVENT_WINDOW.start) || now > new Date(EVENT_WINDOW.end))) {
    console.log('Outside event window. Skipping update. Use --ignore-window to force.');
    return;
  }
  
  await ensureImages(forceImageRefresh);

  const $ = await fetchRouteData();
  const lastUpdatedRaw = $('b:contains("LAST UPDATED")').text().replace('LAST UPDATED:', '').trim();
  const lastUpdated = lastUpdatedRaw || new Date().toISOString().substring(11, 16);

  let targetRow = null;
  const headers = [];
  $('table tr').each((i, row) => {
    if (i === 0) {
      $(row).find('th, td').each((_, cell) => {
        headers.push($(cell).text().trim().toUpperCase());
      });
      return;
    }
    
    const cells = $(row).find('td');
    const code = $(cells[1]).text().trim();
    if (code === TEAM_CODE) {
      targetRow = cells;
    }
  });

  if (!targetRow) {
    throw new Error(`Team ${TEAM_CODE} not found on the page.`);
  }

  // Extract data based on header matching or fixed ordering
  const extractedTimes = {};
  for (let i = 2; i < targetRow.length; i++) {
    const headerName = headers[i] ? headers[i].replace(/<[^>]+>/g, '').trim() : null;
    const timeVal = parseTime($(targetRow[i]).text().trim());
    if (headerName && timeVal) {
      extractedTimes[headerName] = timeVal;
    } else {
      // fallback to positional if header not clear
      if (i - 2 < CHECKPOINTS.length) {
         extractedTimes[CHECKPOINTS[i - 2]] = timeVal;
      }
    }
  }

  const checkpointsData = [];
  let reachedCount = 0;
  let startTime = extractedTimes["START"] || null;
  let currentCheckpoint = null;
  let nextCheckpoint = null;

  for (let i = 0; i < CHECKPOINTS.length; i++) {
    const cpName = CHECKPOINTS[i];
    const arrivalTime = extractedTimes[cpName] || null;
    const reached = !!arrivalTime;
    
    let elapsed = null;
    if (reached && startTime && arrivalTime && cpName !== "START") {
      const minutes = calculateElapsedMinutes(startTime, arrivalTime);
      elapsed = {
        minutes,
        label: formatElapsed(minutes)
      };
    }

    if (reached) {
      reachedCount++;
      currentCheckpoint = cpName;
    } else if (!nextCheckpoint) {
      nextCheckpoint = cpName;
    }

    const progressPercent = Math.round(((i + (reached ? 1 : 0)) / CHECKPOINTS.length) * 100);
    const slug = cpName.toLowerCase().replace(/\s+/g, '-');
    
    // Prioritize photo over SVG
    let localImageUrl = `./images/${slug}.svg`;
    const extensions = ['.webp', '.png', '.jpg', '.jpeg'];
    for (const ext of extensions) {
      if (fs.existsSync(path.join(IMAGES_DIR, `${slug}${ext}`))) {
        localImageUrl = `./images/${slug}${ext}`;
        break;
      }
    }

    checkpointsData.push({
      name: cpName,
      arrivalTime,
      reached,
      elapsed,
      progressPercent,
      coordinates: CHECKPOINT_COORDS[cpName] || null,
      localImageUrl,
      imageSource: "placeholder",
      imageTitle: cpName
    });
  }

  // Calculate Pace, ETA and Distance-based Progress
  let teamPace = null; // min/km
  let nextCpETA = null;
  let distCovered = 0;
  const segmentKeys = Object.keys(SEGMENT_DISTANCES);
  const totalDist = Object.values(SEGMENT_DISTANCES).reduce((a, b) => a + b, 0);

  // Find the last completed checkpoint by index
  let lastReachedIdx = -1;
  for (let i = checkpointsData.length - 1; i >= 0; i--) {
    if (checkpointsData[i].reached) {
      lastReachedIdx = i;
      break;
    }
  }

  // Calculate distance covered based on last reached index
  for (let i = 0; i < lastReachedIdx; i++) {
    const key = `${CHECKPOINTS[i]}-${CHECKPOINTS[i+1]}`;
    if (SEGMENT_DISTANCES[key]) distCovered += SEGMENT_DISTANCES[key];
  }

  if (lastReachedIdx > 0) {
    const lastCp = checkpointsData[lastReachedIdx];
    // Find the previous reached CP with a time to calculate pace
    let prevReachedWithTime = null;
    for (let i = lastReachedIdx - 1; i >= 0; i--) {
        if (checkpointsData[i].reached && checkpointsData[i].arrivalTime) {
            prevReachedWithTime = checkpointsData[i];
            break;
        }
    }
    
    if (prevReachedWithTime && lastCp.arrivalTime) {
      // Calculate distance between these two specific points
      let segmentDist = 0;
      for (let i = checkpointsData.indexOf(prevReachedWithTime); i < lastReachedIdx; i++) {
          const key = `${CHECKPOINTS[i]}-${CHECKPOINTS[i+1]}`;
          segmentDist += (SEGMENT_DISTANCES[key] || 0);
      }

      const timeDiff = calculateElapsedMinutes(prevReachedWithTime.arrivalTime, lastCp.arrivalTime);
      
      if (segmentDist > 0 && timeDiff > 0) {
        teamPace = Math.round((timeDiff / segmentDist) * 10) / 10;
        
        // Predict ETA for next CP
        if (lastReachedIdx < checkpointsData.length - 1) {
            const nextCp = checkpointsData[lastReachedIdx + 1];
            const nextSegmentKey = `${lastCp.name}-${nextCp.name}`;
            const nextDist = SEGMENT_DISTANCES[nextSegmentKey];
            if (nextDist) {
                const estMinutes = nextDist * teamPace;
                const [h, m] = lastCp.arrivalTime.split(':').map(Number);
                let totalMin = h * 60 + m + estMinutes;
                const etaH = Math.floor((totalMin / 60) % 24);
                const etaM = Math.floor(totalMin % 60);
                nextCpETA = `${String(etaH).padStart(2, '0')}:${String(etaM).padStart(2, '0')}`;
            }
        }
      }
    }
  }

  const routeProgressPercent = Math.round((distCovered / totalDist) * 100);
  reachedCount = lastReachedIdx + 1;

  const data = {
    sourceUrl: ROUTE_URL,
    generatedAt: new Date().toISOString(),
    sourceLastUpdated: lastUpdated,
    route: "I",
    team: {
      requestedName: TEAM_NAME,
      sourceName: $(targetRow[0]).text().trim(),
      code: TEAM_CODE,
      nameMatchesRequest: $(targetRow[0]).text().trim().includes(TEAM_NAME.split(' ')[0]),
      avatarUrl: "./images/jjmb.png"
    },
    routeProgressPercent,
    reachedCount,
    totalCheckpoints: CHECKPOINTS.length,
    distanceCovered: Math.round(distCovered * 10) / 10,
    totalDistance: Math.round(totalDist * 10) / 10,
    currentCheckpoint: checkpointsData.find(c => c.name === currentCheckpoint) || null,
    nextCheckpoint: checkpointsData.find(c => c.name === nextCheckpoint) || null,
    checkpoints: checkpointsData
  };

  if (data.nextCheckpoint) {
    data.nextCheckpoint.eta = nextCpETA;
    data.nextCheckpoint.pace = teamPace;
  }

  // Keep existing image metadata if file exists and not forcing
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const oldData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
      if (!forceImageRefresh && oldData.checkpoints) {
        data.checkpoints.forEach(cp => {
          const oldCp = oldData.checkpoints.find(c => c.name === cp.name);
          if (oldCp && oldCp.localImageUrl) {
            cp.localImageUrl = oldCp.localImageUrl;
          }
        });
      }
    } catch(e) {}
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
  
  // Update history log
  const HISTORY_FILE = path.join(process.cwd(), 'public', 'history.json');
  let history = [];
  if (fs.existsSync(HISTORY_FILE)) {
    try { history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); } catch(e) {}
  }
  // Only add if data is new/different from last entry
  const lastEntry = history[history.length - 1];
  if (!lastEntry || lastEntry.sourceLastUpdated !== data.sourceLastUpdated) {
    history.push({
        timestamp: data.generatedAt,
        sourceLastUpdated: data.sourceLastUpdated,
        reachedCount: data.reachedCount,
        currentCheckpoint: data.currentCheckpoint ? data.currentCheckpoint.name : null,
        pace: data.nextCheckpoint ? data.nextCheckpoint.pace : null
    });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  }

  console.log(`Successfully updated ${OUTPUT_FILE}`);
}

updateData().catch(err => {
  console.error(err);
  process.exit(1);
});
