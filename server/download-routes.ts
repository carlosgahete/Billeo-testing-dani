import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ruta para descargar el archivo AI (SVG con extensión .ai)
router.get('/icons/ai', (req, res) => {
  const aiFilePath = path.join(__dirname, '../icons/billeo-icons.ai');
  
  if (fs.existsSync(aiFilePath)) {
    res.download(aiFilePath, 'billeo-icons.ai', (err) => {
      if (err) {
        console.error('Error al descargar el archivo .ai:', err);
        res.status(500).send('Error al descargar el archivo');
      }
    });
  } else {
    res.status(404).send('Archivo no encontrado');
  }
});

// Ruta para descargar el archivo SVG combinado
router.get('/icons/svg', (req, res) => {
  const svgFilePath = path.join(__dirname, '../icons/billeo-icons-collection.svg');
  
  if (fs.existsSync(svgFilePath)) {
    res.download(svgFilePath, 'billeo-icons-collection.svg', (err) => {
      if (err) {
        console.error('Error al descargar el archivo SVG:', err);
        res.status(500).send('Error al descargar el archivo');
      }
    });
  } else {
    res.status(404).send('Archivo no encontrado');
  }
});

// Ruta para descargar un icono individual
router.get('/icons/:iconName', (req, res) => {
  const { iconName } = req.params;
  const iconFilePath = path.join(__dirname, `../icons/${iconName}.svg`);
  
  if (fs.existsSync(iconFilePath)) {
    res.download(iconFilePath, `${iconName}.svg`, (err) => {
      if (err) {
        console.error(`Error al descargar el icono ${iconName}:`, err);
        res.status(500).send('Error al descargar el archivo');
      }
    });
  } else {
    res.status(404).send('Icono no encontrado');
  }
});

// Ruta para obtener la lista de iconos disponibles
router.get('/icons', (req, res) => {
  const iconsDir = path.join(__dirname, '../icons');
  
  if (fs.existsSync(iconsDir)) {
    try {
      const files = fs.readdirSync(iconsDir);
      const svgFiles = files.filter(file => file.endsWith('.svg') && file !== 'billeo-icons-collection.svg');
      
      const iconNames = svgFiles.map(file => path.basename(file, '.svg'));
      
      res.json({
        icons: iconNames,
        downloadUrls: {
          aiCollection: '/download/icons/ai',
          svgCollection: '/download/icons/svg',
          individualIcons: iconNames.map(name => ({
            name,
            url: `/download/icons/${name}`
          }))
        }
      });
    } catch (err) {
      console.error('Error al leer el directorio de iconos:', err);
      res.status(500).send('Error al obtener la lista de iconos');
    }
  } else {
    res.status(404).send('Directorio de iconos no encontrado');
  }
});

export default router;