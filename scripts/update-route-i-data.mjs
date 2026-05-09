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
  
  for (const cp of CHECKPOINTS) {
    const slug = cp.toLowerCase().replace(/\s+/g, '-');
    const imagePath = path.join(IMAGES_DIR, `${slug}.svg`);
    
    if (forceRefresh || !fs.existsSync(imagePath)) {
      // Generate a simple SVG placeholder instead of complex network lookups
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
        <rect width="100%" height="100%" fill="#2a3f2a" />
        <text x="50%" y="50%" font-family="sans-serif" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">${cp}</text>
      </svg>`;
      fs.writeFileSync(imagePath, svg);
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

    checkpointsData.push({
      name: cpName,
      arrivalTime,
      reached,
      elapsed,
      progressPercent,
      coordinates: CHECKPOINT_COORDS[cpName] || null,
      localImageUrl: `./images/${slug}.svg`,
      imageSource: "placeholder",
      imageTitle: cpName
    });
  }

  const routeProgressPercent = Math.round((reachedCount / CHECKPOINTS.length) * 100);

  const data = {
    sourceUrl: ROUTE_URL,
    generatedAt: new Date().toISOString(),
    sourceLastUpdated: lastUpdated,
    route: "I",
    team: {
      requestedName: TEAM_NAME,
      sourceName: $(targetRow[0]).text().trim(),
      code: TEAM_CODE,
      nameMatchesRequest: $(targetRow[0]).text().trim().includes(TEAM_NAME.split(' ')[0])
    },
    routeProgressPercent,
    reachedCount,
    currentCheckpoint: checkpointsData.find(c => c.name === currentCheckpoint) || null,
    nextCheckpoint: checkpointsData.find(c => c.name === nextCheckpoint) || null,
    checkpoints: checkpointsData
  };

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
  console.log(`Successfully updated ${OUTPUT_FILE}`);
}

updateData().catch(err => {
  console.error(err);
  process.exit(1);
});
