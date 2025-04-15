import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directorio donde están los SVG descargados
const iconsDir = path.join(__dirname, '../icons');

// Directorio para guardar el resultado
const outputDir = path.join(__dirname, '../icons');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function createIllustratorFile() {
  // Verificar que el directorio de iconos existe
  if (!fs.existsSync(iconsDir)) {
    console.error('El directorio de iconos no existe:', iconsDir);
    return;
  }

  // Leer los archivos SVG del directorio
  const svgFiles = fs.readdirSync(iconsDir).filter(file => file.endsWith('.svg') && file !== 'billeo-icons-collection.svg');
  
  if (svgFiles.length === 0) {
    console.error('No se encontraron archivos SVG en:', iconsDir);
    return;
  }

  console.log(`Encontrados ${svgFiles.length} archivos SVG.`);

  // Crear un archivo AI compatible (SVG con extensión .ai)
  let aiContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="800" height="${Math.ceil(svgFiles.length / 4) * 200}" viewBox="0 0 800 ${Math.ceil(svgFiles.length / 4) * 200}">
  <!-- Adobe Illustrator compatible file -->
  <title>Billeo Icons Collection</title>
  <style>
    .icon { stroke: #000; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .icon-group { cursor: pointer; }
    .icon-label { font-family: 'Arial'; font-size: 12px; text-anchor: middle; }
  </style>
`;

  // Crear símbolos para cada icono
  aiContent += '  <defs>\n';
  
  for (const fileName of svgFiles) {
    const iconName = path.basename(fileName, '.svg');
    const filePath = path.join(iconsDir, fileName);
    const svgContent = fs.readFileSync(filePath, 'utf-8');
    
    // Extraer el path del SVG
    const pathMatch = svgContent.match(/<path[^>]*?d="([^"]*)"[^>]*>/g);
    
    if (pathMatch) {
      aiContent += `    <symbol id="icon-${iconName}" viewBox="0 0 24 24">\n`;
      for (const path of pathMatch) {
        aiContent += `      ${path}\n`;
      }
      aiContent += `    </symbol>\n`;
    }
  }
  
  aiContent += '  </defs>\n\n';

  // Colocar los iconos en una cuadrícula
  const iconsPerRow = 4;
  const iconWidth = 200;
  const iconHeight = 200;

  for (let i = 0; i < svgFiles.length; i++) {
    const fileName = svgFiles[i];
    const iconName = path.basename(fileName, '.svg');
    
    // Posición en la cuadrícula
    const row = Math.floor(i / iconsPerRow);
    const col = i % iconsPerRow;
    const x = col * iconWidth + 100;
    const y = row * iconHeight + 100;
    
    aiContent += `  <g class="icon-group" transform="translate(${x-50}, ${y-50})">\n`;
    aiContent += `    <use xlink:href="#icon-${iconName}" class="icon" width="100" height="100" />\n`;
    aiContent += `    <text class="icon-label" x="50" y="130">${iconName}</text>\n`;
    aiContent += `  </g>\n`;
  }

  aiContent += '</svg>';

  // Guardar el archivo .ai (que es realmente un SVG)
  const aiOutputPath = path.join(outputDir, 'billeo-icons.ai');
  fs.writeFileSync(aiOutputPath, aiContent);
  
  console.log(`Archivo compatible con Adobe Illustrator guardado en: ${aiOutputPath}`);
  console.log(`Nota: Este archivo tiene extensión .ai pero es en realidad un SVG compatible con Adobe Illustrator.`);
  console.log(`Puedes abrirlo directamente en Adobe Illustrator y tendrás todos los iconos con sus nombres.`);
}

// Ejecutar la función
createIllustratorFile();