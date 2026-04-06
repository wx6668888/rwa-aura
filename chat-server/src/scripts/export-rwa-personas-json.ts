import * as fs from 'fs';
import * as path from 'path';
import { getPersonasJsonExport } from '../data/rwa-bot-personas-50-built';

const out = path.join(__dirname, '../../data/rwa-bot-personas-50.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, getPersonasJsonExport(), 'utf8');
console.log('[export-rwa-personas-json] Wrote', out);
