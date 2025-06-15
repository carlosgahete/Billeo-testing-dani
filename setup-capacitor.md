# 📱 Guía: Convertir Billeo Web App a App Nativa con Capacitor

## ¿Qué es Capacitor?
Capacitor es la plataforma de Ionic para crear apps nativas desde apps web. Es más moderno que Cordova/PhoneGap.

## Ventajas de Capacitor:
✅ **Sin barra de navegador** - App nativa completa
✅ **Acceso a APIs nativas** - Cámara, GPS, notificaciones, etc.
✅ **Hot reload durante desarrollo**
✅ **Compatible con cualquier framework web** (React, Vue, Angular, vanilla JS)
✅ **Fácil publicación** en App Store y Google Play

---

## 🚀 SETUP PASO A PASO

### 1. Instalar Capacitor en tu proyecto

```bash
# En tu directorio del proyecto
npm install @capacitor/core @capacitor/cli

# Inicializar Capacitor
npx cap init "Billeo" "com.billeo.app"
```

### 2. Configurar el build de tu frontend

```bash
# Asegurar que tu app se build correctamente
cd client
npm run build

# El build debe generar archivos estáticos en client/dist
```

### 3. Configurar capacitor.config.ts

```typescript
import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.billeo.app',
  appName: 'Billeo',
  webDir: 'client/dist', // Donde están tus archivos compilados
  server: {
    androidScheme: 'https',
    // Para desarrollo, puedes usar tu servidor:
    // url: 'https://app.billeo.es',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffffff",
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#ffffff'
    }
  }
};

export default config;
```

### 4. Añadir plataformas móviles

```bash
# iOS
npm install @capacitor/ios
npx cap add ios

# Android
npm install @capacitor/android
npx cap add android
```

### 5. Sincronizar archivos

```bash
# Copiar archivos web a las apps nativas
npx cap sync
```

---

## 📱 DESARROLLO iOS

### Requisitos:
- Mac con Xcode
- Cuenta de desarrollador Apple ($99/año para publicar)

### Pasos:
```bash
# Abrir proyecto iOS
npx cap open ios
```

Esto abrirá Xcode donde puedes:
- ✅ Configurar iconos y splash screens
- ✅ Configurar permisos
- ✅ Probar en simulador
- ✅ Compilar para dispositivo
- ✅ Subir al App Store

---

## 🤖 DESARROLLO ANDROID

### Requisitos:
- Android Studio
- Cuenta Google Play Console ($25 una sola vez)

### Pasos:
```bash
# Abrir proyecto Android
npx cap open android
```

En Android Studio puedes:
- ✅ Configurar iconos y splash screens
- ✅ Probar en emulador/dispositivo
- ✅ Generar APK/AAB
- ✅ Subir a Google Play

---

## 🔧 CONFIGURACIONES IMPORTANTES

### 1. Permisos necesarios (config/capacitor.config.ts)

```typescript
plugins: {
  Camera: {
    permissions: ['camera', 'photos']
  },
  Geolocation: {
    permissions: ['location']
  },
  PushNotifications: {
    presentationOptions: ['badge', 'sound', 'alert']
  }
}
```

### 2. Iconos de la app
Colocar iconos en:
- `resources/icon.png` (1024x1024)
- Capacitor generará automáticamente todos los tamaños

### 3. Splash Screen
- `resources/splash.png` (2732x2732)

---

## 🚀 WORKFLOW DE DESARROLLO

1. **Desarrollar en web** (`npm run dev`)
2. **Build para producción** (`npm run build`)
3. **Sincronizar con apps** (`npx cap sync`)
4. **Probar en dispositivo** (`npx cap run ios/android`)
5. **Compilar para tiendas**

---

## 📦 ALTERNATIVAS MÁS SIMPLES

Si Capacitor es muy complejo, también puedes usar:

### PWA (Progressive Web App)
- ✅ Más simple
- ✅ Se puede "instalar" desde Safari/Chrome
- ✅ Funciona offline
- ❌ No está en las tiendas de apps

### WebView App con herramientas online:
- **PWABuilder** (Microsoft)
- **Appgyver** (SAP)
- **PhoneGap Build** (Adobe)

---

## 🎯 RECOMENDACIÓN PARA BILLEO

Para tu caso específico, recomiendo:

1. **Empezar con PWA** - Más rápido y simple
2. **Después migrar a Capacitor** - Para estar en las tiendas
3. **Usar tu HTTPS existente** - Funciona perfectamente como base

¿Quieres que empecemos con PWA o directamente con Capacitor? 