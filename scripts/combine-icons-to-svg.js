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

async function combineIconsToSvg() {
  // Verificar que el directorio de iconos existe
  if (!fs.existsSync(iconsDir)) {
    console.error('El directorio de iconos no existe:', iconsDir);
    return;
  }

  // Leer los archivos SVG del directorio
  const svgFiles = fs.readdirSync(iconsDir).filter(file => file.endsWith('.svg'));
  
  if (svgFiles.length === 0) {
    console.error('No se encontraron archivos SVG en:', iconsDir);
    return;
  }

  console.log(`Encontrados ${svgFiles.length} archivos SVG.`);

  // Crear un SVG contenedor para todos los iconos
  let combinedSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${Math.ceil(svgFiles.length / 5) * 200}" viewBox="0 0 1000 ${Math.ceil(svgFiles.length / 5) * 200}">
  <title>Billeo Icons Collection</title>
  <defs>
    <style>
      .icon { stroke: #000; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
      .icon-title { font-family: Arial, sans-serif; font-size: 12px; text-anchor: middle; }
    </style>
  </defs>
`;

  // Colocar los iconos en una cuadrícula
  const iconsPerRow = 5;
  const iconWidth = 200;
  const iconHeight = 200;

  // Procesando cada archivo SVG
  for (let i = 0; i < svgFiles.length; i++) {
    const fileName = svgFiles[i];
    const filePath = path.join(iconsDir, fileName);
    const svgContent = fs.readFileSync(filePath, 'utf-8');
    
    // Posición en la cuadrícula
    const row = Math.floor(i / iconsPerRow);
    const col = i % iconsPerRow;
    const x = col * iconWidth;
    const y = row * iconHeight;
    
    // Extraer el contenido del path del SVG original
    const pathMatch = svgContent.match(/<path[^>]*>/g);
    const svgTag = svgContent.match(/<svg[^>]*>/);
    
    if (pathMatch && svgTag) {
      // Obtener el nombre del icono sin la extensión
      const iconName = path.basename(fileName, '.svg');
      
      // Agregar el icono al SVG combinado
      combinedSvg += `
  <g transform="translate(${x + 100}, ${y + 80})">
    <g class="icon" transform="scale(1.5)">
      ${pathMatch.join('\n      ')}
    </g>
    <text class="icon-title" x="0" y="60">${iconName}</text>
  </g>`;
    }
  }

  // Cerrar el tag SVG
  combinedSvg += `
</svg>`;

  // Guardar el archivo SVG combinado
  const outputPath = path.join(outputDir, 'billeo-icons-collection.svg');
  fs.writeFileSync(outputPath, combinedSvg);
  
  console.log(`SVG combinado guardado en: ${outputPath}`);
  console.log(`Este archivo SVG puedes importarlo en Adobe Illustrator para crear tu archivo .ai`);
}

// Ejecutar la función
combineIconsToSvg();