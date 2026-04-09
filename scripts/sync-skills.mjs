import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = dirname(scriptDir);
const targetDir = join(packageRoot, 'skills');

function resolveSourceDir() {
  const adjacentRepo = join(packageRoot, '..', 'ClawPowers-Skills', 'src', 'skills');
  if (existsSync(adjacentRepo)) return adjacentRepo;

  const installedCandidates = [
    join(packageRoot, 'node_modules', 'clawpowers', 'src', 'skills'),
    join(packageRoot, '..', 'clawpowers', 'src', 'skills'),
  ];

  for (const packagedSkills of installedCandidates) {
    if (existsSync(packagedSkills)) return packagedSkills;
  }

  throw new Error('Unable to locate ClawPowers skill assets under ../ClawPowers-Skills/src/skills or node_modules/clawpowers/src/skills');
}

function syncDirectory(sourceDir, outputDir) {
  mkdirSync(outputDir, { recursive: true });
  const entries = readdirSync(sourceDir);
  for (const entry of entries) {
    const sourcePath = join(sourceDir, entry);
    const outputPath = join(outputDir, entry);
    const stat = statSync(sourcePath);
    if (stat.isDirectory()) {
      const skillFile = join(sourcePath, 'SKILL.md');
      if (existsSync(skillFile)) {
        rmSync(outputPath, { recursive: true, force: true });
        cpSync(sourcePath, outputPath, { recursive: true });
      }
    }
  }
}

const sourceDir = resolveSourceDir();
syncDirectory(sourceDir, targetDir);
console.log(`Synced ClawPowers skills from ${sourceDir} -> ${targetDir}`);
