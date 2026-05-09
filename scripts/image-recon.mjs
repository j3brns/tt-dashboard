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

const TARGETS = [
    { id: 'jjmb', keywords: ['jjmb', 'hero', 'avatar', 'team'] },
    ...CHECKPOINTS.map(cp => ({
        id: cp.toLowerCase().replace(/\s+/g, '-'),
        keywords: cp.toLowerCase().split(' '),
        wikiTitle: cp.charAt(0).toUpperCase() + cp.slice(1).toLowerCase()
    }))
];

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'public') {
        arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
      }
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });
  return arrayOfFiles;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function downloadImage(url, dest) {
    const res = await fetch(url, { headers: { 'User-Agent': 'TenTorsDashboard/1.0' } });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(buffer));
}

async function runWikiRecon(target) {
    if (['start', 'finish', 'jjmb'].includes(target.id)) return;
    
    console.log(`RECON: [${target.id}] Requesting Intel...`);
    await sleep(2000); 

    try {
        const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(target.wikiTitle)}&prop=pageimages&format=json&pithumbsize=1000&origin=*`;
        const res = await fetch(url, { headers: { 'User-Agent': 'TenTorsDashboard/1.0' } });
        const data = await res.json();
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        
        if (pageId !== '-1' && pages[pageId].thumbnail) {
            const source = pages[pageId].thumbnail.source;
            const dest = path.join(TARGET_DIR, `${target.id}.jpg`);
            await downloadImage(source, dest);
            console.log(`  INTEL SECURED: ${target.id}.jpg`);
            return true;
        }
    } catch (e) {
        console.log(`  INTEL FAILURE: ${e.message}`);
    }
    return false;
}

async function startMission() {
    console.log('--- TACTICAL IMAGE RECON COMMENCING ---');
    if (!fs.existsSync(TARGET_DIR)) fs.mkdirSync(TARGET_DIR, { recursive: true });

    const allFiles = getAllFiles(process.cwd());
    const foundLocal = new Set();

    console.log('Phase 1: Local Sweep...');
    allFiles.forEach(file => {
        if (!IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase())) return;
        const fileName = path.basename(file).toLowerCase();
        
        if (file.includes(path.join('public', 'images'))) {
            const id = path.basename(file, path.extname(file));
            if (path.extname(file) !== '.svg') foundLocal.add(id);
            return;
        }

        for (const target of TARGETS) {
            const isMatch = target.id === 'jjmb' ? target.keywords.some(k => fileName.includes(k)) : target.keywords.every(k => fileName.includes(k));
            if (isMatch) {
                const dest = path.join(TARGET_DIR, `${target.id}${path.extname(file).toLowerCase()}`);
                fs.copyFileSync(file, dest);
                console.log(`  LOCAL MATCH: ${target.id}`);
                foundLocal.add(target.id);
                break;
            }
        }
    });

    console.log('Phase 2: Web Intel Sweep...');
    for (const target of TARGETS) {
        if (foundLocal.has(target.id)) continue;
        const hasPhoto = IMAGE_EXTENSIONS.some(ext => fs.existsSync(path.join(TARGET_DIR, `${target.id}${ext}`)));
        if (!hasPhoto) await runWikiRecon(target);
    }
    console.log('--- RECON MISSION COMPLETE ---');
}

startMission();
