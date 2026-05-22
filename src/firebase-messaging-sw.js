/**
 * firebase-messaging-sw.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Service Worker de Firebase Cloud Messaging para notificaciones en BACKGROUND.
 *
 * Este archivo DEBE estar en la raíz del dominio (/firebase-messaging-sw.js)
 * para que Firebase pueda registrarlo correctamente.
 *
 * IMPORTANTE: Reemplaza los valores de firebaseConfig con los datos reales
 * de tu proyecto Firebase (Consola Firebase → Configuración del proyecto →
 * Tus apps → SDK de Firebase).
 *
 * ¿Cómo obtener los valores?
 *   1. Ve a https://console.firebase.google.com
 *   2. Selecciona tu proyecto
 *   3. Configuración del proyecto (⚙️) → General → Tus apps → Web
 *   4. Copia el objeto firebaseConfig
 *   5. Para vapidKey: Configuración → Cloud Messaging → Certificados push web
 *
 * Este SW maneja:
 *   • Notificaciones push cuando la app está en BACKGROUND o CERRADA
 *   • Click en notificaciones → abre/enfoca la app en /ordenes
 */

// ─── Importar Firebase Messaging compat (versión para SW) ────────────────────

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ─── Configuración Firebase ───────────────────────────────────────────────────
// ⚠️ REEMPLAZA ESTOS VALORES con los de tu proyecto Firebase real

const firebaseConfig = {
  apiKey: 'AIzaSyPLACEHOLDER_REPLACE_WITH_REAL_KEY',
  authDomain: 'proyecto-edu-PLACEHOLDER.firebaseapp.com',
  projectId: 'proyecto-edu-PLACEHOLDER',
  storageBucket: 'proyecto-edu-PLACEHOLDER.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:PLACEHOLDER'
};

// ─── Inicializar Firebase ─────────────────────────────────────────────────────

// Verificar si la config es placeholder antes de inicializar
const esConfigReal = !firebaseConfig.apiKey.includes('PLACEHOLDER') &&
                     !firebaseConfig.projectId.includes('PLACEHOLDER');

if (esConfigReal) {
  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // ─── Manejar mensajes en background ──────────────────────────────────────

    messaging.onBackgroundMessage((payload) => {
      console.log('[FCM SW] Mensaje en background recibido:', payload);

      const titulo = payload.notification?.title || '📋 Lab.Rosas';
      const opciones = {
        body: payload.notification?.body || 'Tienes una notificación pendiente',
        icon: payload.notification?.icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: payload.data?.tag || `fcm-${Date.now()}`,
        data: {
          url: payload.data?.url || '/ordenes',
          ...payload.data
        },
        requireInteraction: false,
        vibrate: [200, 100, 200],
        actions: [
          {
            action: 'ver',
            title: '👁️ Ver orden'
          },
          {
            action: 'cerrar',
            title: '✕ Cerrar'
          }
        ]
      };

      return self.registration.showNotification(titulo, opciones);
    });

    console.log('[FCM SW] ✅ Firebase Messaging SW inicializado correctamente');
  } catch (error) {
    console.error('[FCM SW] Error inicializando Firebase:', error);
  }
} else {
  console.warn(
    '[FCM SW] ⚠️ Configuración Firebase con valores PLACEHOLDER.\n' +
    'Las notificaciones en background NO funcionarán hasta que reemplaces\n' +
    'los valores en src/firebase-messaging-sw.js con los datos reales\n' +
    'de tu proyecto Firebase.'
  );
}

// ─── Click en notificación ────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Click en notificación:', event.notification.tag);

  const accion = event.action;
  event.notification.close();

  // Si el usuario hizo clic en "Cerrar", no hacer nada más
  if (accion === 'cerrar') return;

  const urlDestino = event.notification.data?.url || '/ordenes';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Buscar una ventana ya abierta con la app
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            if ('navigate' in client) {
              return client.navigate(urlDestino);
            }
            return;
          }
        }
        // No hay ventana abierta → abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(urlDestino);
        }
      })
  );
});

// ─── Cierre de notificación ───────────────────────────────────────────────────

self.addEventListener('notificationclose', (event) => {
  console.log('[FCM SW] Notificación cerrada:', event.notification.tag);
});
