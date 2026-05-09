import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
const TARGET_DIR = path.join(process.cwd(), 'public', 'images');

const CHECKPOINTS = [
  "START", "HIGHER TOR", "COSDON HILL", "SHILSTONE TOR", "STEEPERTON TOR",
  "WATERN TOR", "SITTAFORD TOR", "STANNON TOR", "POSTBRIDGE", "HIGHER WHITE TOR",
  "HOLMING BEAM", "WHITE BARROW", "STANDON FARM", "WILLSWORTHY", "HARE TOR",
  "KITTY TOR", "EAST MILL TOR", "FINISH"
];

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

const TARGETS = CHECKPOINTS.map(cp => ({
    id: cp.toLowerCase().replace(/\s+/g, '-'),
    name: cp,
    coords: CHECKPOINT_COORDS[cp]
}));

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function downloadImage(url, dest) {
    const res = await fetch(url, { headers: { 'User-Agent': 'TenTorsDashboard/1.0 (https://github.com/j3brns/tt-dashboard)' } });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(buffer));
}

// Phase 2: Wikimedia GPS-based Discovery
async function runGeosearch(target) {
    if (['start', 'finish'].includes(target.id)) return false;
    if (!target.coords) return false;

    console.log(`GPS RECON: [${target.name}] Scanning coordinates...`);
    await sleep(2000);

    try {
        const url = `https://commons.wikimedia.org/w/api.php?action=query&list=geosearch&gsradius=500&gscoord=${target.coords.lat}|${target.coords.lon}&format=json&origin=*`;
        const res = await fetch(url, { headers: { 'User-Agent': 'TenTorsDashboard/1.0' } });
        const data = await res.json();
        
        const results = data.query.geosearch;
        if (results && results.length > 0) {
            // Get the first result's image
            const pageId = results[0].pageid;
            const imgUrl = `https://commons.wikimedia.org/w/api.php?action=query&pageids=${pageId}&prop=pageimages&piprop=thumbnail&pithumbsize=1000&format=json&origin=*`;
            const imgRes = await fetch(imgUrl, { headers: { 'User-Agent': 'TenTorsDashboard/1.0' } });
            const imgData = await imgRes.json();
            
            const thumb = imgData.query.pages[pageId].thumbnail;
            if (thumb) {
                const dest = path.join(TARGET_DIR, `${target.id}.jpg`);
                await downloadImage(thumb.source, dest);
                console.log(`  INTEL SECURED: ${target.id}.jpg (Found via GPS)`);
                return true;
            }
        }
    } catch (e) {
        console.log(`  GPS RECON FAILURE: ${e.message}`);
    }
    return false;
}

// Phase 3: Satellite Zoom Fallback (ArcGIS Tiles)
async function runSatelliteRecon(target) {
    if (!target.coords) return false;
    
    console.log(`SATELLITE RECON: [${target.name}] Capturing zoom...`);
    
    const z = 18; // High zoom
    const lat = target.coords.lat;
    const lon = target.coords.lon;
    
    const x = Math.floor((lon + 180) / 360 * Math.pow(2, z));
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
    
    const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
    const dest = path.join(TARGET_DIR, `${target.id}.jpg`);
    
    try {
        await downloadImage(url, dest);
        console.log(`  SATELLITE INTEL SECURED: ${target.id}.jpg (Zoom Level ${z})`);
        return true;
    } catch (e) {
        console.log(`  SATELLITE RECON FAILURE: ${e.message}`);
    }
    return false;
}

async function startMission() {
    console.log('--- TACTICAL IMAGE RECON COMMENCING ---');
    if (!fs.existsSync(TARGET_DIR)) fs.mkdirSync(TARGET_DIR, { recursive: true });

    const foundLocal = new Set();
    const files = fs.readdirSync(TARGET_DIR);
    files.forEach(f => {
        const id = path.basename(f, path.extname(f));
        if (path.extname(f) !== '.svg') foundLocal.add(id);
    });

    console.log(`Mission Intelligence: ${foundLocal.size}/${TARGETS.length} targets already acquired.`);

    for (const target of TARGETS) {
        if (foundLocal.has(target.id) || target.id === 'jjmb') continue;

        // Try Wikimedia GPS search first
        const secured = await runGeosearch(target);
        
        // Otherwise, use Satellite Zoom
        if (!secured) {
            await runSatelliteRecon(target);
        }
    }

    console.log('--- RECON MISSION COMPLETE ---');
}

startMission();
