import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starter oppsett av Tailwind CSS...');

try {
  // 1. Installer @tailwindcss/vite
  console.log('Installerer @tailwindcss/vite...');
  execSync('npm install tailwindcss @tailwindcss/vite', { stdio: 'inherit' });

  // 2. Oppdater vite.config.js
  console.log('Oppdaterer vite.config.js...');
  const viteConfigPath = path.join(__dirname, 'vite.config.js');
  let viteConfig = fs.readFileSync(viteConfigPath, 'utf8');

  if (!viteConfig.includes('@tailwindcss/vite')) {
    viteConfig = viteConfig.replace(
      "import react from '@vitejs/plugin-react'",
      "import react from '@vitejs/plugin-react'\nimport tailwindcss from '@tailwindcss/vite'"
    );

    viteConfig = viteConfig.replace(
      "plugins: [react()]",
      "plugins: [\n    react(),\n    tailwindcss(),\n  ]"
    );

    fs.writeFileSync(viteConfigPath, viteConfig);
    console.log('vite.config.js er oppdatert.');
  } else {
    console.log('vite.config.js har allerede Tailwind konfigurert.');
  }

  // 3. Oppdater src/index.css
  console.log('Oppdaterer src/index.css...');
  const cssPath = path.join(__dirname, 'src', 'index.css');
  const cssContent = `@import "tailwindcss";\n`;

  fs.writeFileSync(cssPath, cssContent);
  console.log('src/index.css er oppdatert.');

  console.log('\n✅ Tailwind CSS er nå satt opp riktig!');

} catch (error) {
  console.error('\n❌ En feil oppstod under oppsettet:');
  console.error(error.message);
}

