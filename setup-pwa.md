# 📱 Guía Rápida: Convertir Billeo en PWA

## ¿Qué es una PWA?
Una Progressive Web App se puede "instalar" desde el navegador y funciona como app nativa:
- ✅ **Sin barra de navegador**
- ✅ **Icono en pantalla de inicio**
- ✅ **Funciona offline**
- ✅ **Notificaciones push**
- ✅ **Se instala directamente desde Safari/Chrome**

---

## 🚀 SETUP SÚPER RÁPIDO (15 minutos)

### 1. Crear manifest.json

Crea `client/public/manifest.json`:

```json
{
  "name": "Billeo",
  "short_name": "Billeo",
  "description": "Tu app de facturación",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 2. Crear Service Worker

Crea `client/public/sw.js`:

```javascript
const CACHE_NAME = 'billeo-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      }
    )
  );
});
```

### 3. Registrar el Service Worker

En tu `client/src/main.tsx` o archivo principal:

```typescript
// Registrar service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
```

### 4. Añadir meta tags al HTML

En tu `client/index.html`:

```html
<head>
  <!-- PWA Meta Tags -->
  <meta name="theme-color" content="#000000">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="Billeo">
  
  <!-- Manifest -->
  <link rel="manifest" href="/manifest.json">
  
  <!-- Apple Touch Icons -->
  <link rel="apple-touch-icon" href="/icon-192.png">
  <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png">
  <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png">
</head>
```

### 5. Crear iconos

Necesitas crear estos iconos en `client/public/`:
- `icon-192.png` (192x192 píxeles)
- `icon-512.png` (512x512 píxeles)

---

## 📱 CÓMO INSTALAR LA PWA

### En iPhone/iPad (Safari):
1. Abrir `https://app.billeo.es`
2. Tocar botón "Compartir" 📤
3. Seleccionar "Añadir a pantalla de inicio"
4. ¡Listo! Aparece como app nativa

### En Android (Chrome):
1. Abrir `https://app.billeo.es`
2. Chrome mostrará banner "Instalar app"
3. O ir a menú → "Instalar app"
4. ¡Listo! Se instala como app nativa

### En Desktop:
1. Chrome/Edge mostrarán icono de instalación en barra de direcciones
2. Clic en "Instalar"
3. Se abre como ventana de app separada

---

## 🎯 VENTAJAS DE ESTA OPCIÓN

✅ **Súper rápido** - 15 minutos de setup
✅ **Sin App Store** - Los usuarios la instalan directamente
✅ **Sin costes** - No pagas $99/año de Apple
✅ **Actualizaciones automáticas** - Como cualquier web
✅ **Un solo código** - Misma app para todos los dispositivos

---

## 🚀 WORKFLOW PARA IMPLEMENTAR

¿Quieres que implementemos esto ahora? Es súper rápido:

1. **Creamos los archivos PWA** en tu proyecto
2. **Hacemos deploy** a tu servidor
3. **¡Ya funciona!** Los usuarios pueden instalarla

¿Empezamos con PWA o prefieres la opción más completa de Capacitor? 