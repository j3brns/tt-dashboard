import fs from 'fs';
import path from 'path';

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
        keywords: cp.toLowerCase().split(' ')
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

console.log('--- TACTICAL IMAGE RECON COMMENCING ---');

if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
}

const allFiles = getAllFiles(process.cwd());
const imageFiles = allFiles.filter(f => IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase()));

console.log(`Found ${imageFiles.length} potential image assets in repository.`);

imageFiles.forEach(file => {
    const fileName = path.basename(file).toLowerCase();
    
    // Skip files already in public/images that match our standard naming
    if (file.includes(path.join('public', 'images'))) return;

    for (const target of TARGETS) {
        // Special case for jjmb/hero: any of the keywords will do
        const isMatch = target.id === 'jjmb' 
            ? target.keywords.some(kw => fileName.includes(kw))
            : target.keywords.every(kw => fileName.includes(kw));
        
        if (isMatch) {
            const ext = path.extname(file).toLowerCase();
            const destPath = path.join(TARGET_DIR, `${target.id}${ext}`);
            
            console.log(`MATCH FOUND: [${fileName}] -> [${target.id}${ext}]`);
            
            // Move/Copy to target location
            fs.copyFileSync(file, destPath);
            console.log(`  DEPLOAYED TO: public/images/${target.id}${ext}`);
            break; // Target acquired, move to next file
        }
    }
});

console.log('--- RECON MISSION COMPLETE ---');
