import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');
const programsFile = path.join(dataDir, 'programs.json');
const categoriesFile = path.join(dataDir, 'categories.json');

async function ensure(){
  await fs.mkdir(dataDir, { recursive: true });
  for(const f of [programsFile, categoriesFile]){
    try{ await fs.access(f) } catch{ await fs.writeFile(f, '[]', 'utf-8') }
  }
}

export async function getPrograms(){ await ensure(); return JSON.parse(await fs.readFile(programsFile,'utf-8')||'[]') }
export async function setPrograms(list){ await ensure(); await fs.writeFile(programsFile, JSON.stringify(list,null,2), 'utf-8') }
export async function getCategories(){ await ensure(); return JSON.parse(await fs.readFile(categoriesFile,'utf-8')||'[]') }
export async function setCategories(list){ await ensure(); await fs.writeFile(categoriesFile, JSON.stringify(list,null,2), 'utf-8') }
