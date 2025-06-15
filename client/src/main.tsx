import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/mobile-fixes.css";

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Billeo SW registered: ', registration);
        
        // Escuchar actualizaciones del SW
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nueva versión disponible
                console.log('Nueva versión de Billeo disponible');
                // Aquí podrías mostrar una notificación al usuario
              }
            });
          }
        });
      })
      .catch((registrationError) => {
        console.log('Billeo SW registration failed: ', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
