import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Iconos comunes que usamos en el proyecto
const commonIcons = [
  'arrow-up',
  'arrow-down',
  'trending-up',
  'trending-down',
  'bar-chart-3',
  'pie-chart',
  'home',
  'briefcase',
  'shopping-bag',
  'zap',
  'archive',
  'building',
  'wifi',
  'phone',
  'credit-card',
  'car',
  'truck',
  'book',
  'clipboard-check',
  'clipboard-list',
  'piggy-bank',
  'dollar-sign',
  'users',
  'user'
];

// Crear directorio para los iconos si no existe
const outputDir = path.join(__dirname, '../icons');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Para cada icono, descargarlo de la CDN de Lucide
async function downloadIcons() {
  console.log('Descargando iconos...');
  
  for (const icon of commonIcons) {
    const url = `https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/${icon}.svg`;
    const outputPath = path.join(outputDir, `${icon}.svg`);
    
    // Usar curl para descargar el icono
    exec(`curl -s ${url} -o ${outputPath}`, (error) => {
      if (error) {
        console.error(`Error al descargar ${icon}.svg:`, error);
      } else {
        console.log(`Descargado: ${icon}.svg`);
      }
    });
  }
}

// Iniciar el proceso
downloadIcons();

console.log(`
Una vez finalizada la descarga, encontrarás todos los iconos en el directorio "icons" en la raíz del proyecto.
Estos son archivos SVG que puedes usar en cualquier diseño o aplicación.
`);