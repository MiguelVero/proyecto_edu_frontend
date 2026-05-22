/**
 * service-worker.js — Lab.Rosas
 * ─────────────────────────────────────────────────────────────────────────────
 * Service Worker principal de la aplicación.
 *
 * Responsabilidades:
 *   • Caché básico del app shell para funcionamiento offline
 *   • Manejo de notificaciones push genéricas (Web Push API estándar)
 *   • Recepción de mensajes desde la app Angular (postMessage)
 *
 * NOTA: Las notificaciones push de Firebase Cloud Messaging en background
 * son manejadas por firebase-messaging-sw.js (registrado por el SDK de FCM).
 * Este SW maneja el caché y las notificaciones push estándar.
 */

const CACHE_NAME = 'labrosas-v2';
const APP_SHELL = ['/'];

// ─── Instalación ─────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker v2...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn('[SW] Error cacheando app shell:', err);
      });
    })
  );
  self.skipWaiting();
});

// ─── Activación ───────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker v2 activado');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Eliminando caché antiguo:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ─── Notificaciones Push (Web Push estándar) ──────────────────────────────────
// Este handler procesa notificaciones push enviadas directamente via Web Push API
// (no las de Firebase, que son manejadas por firebase-messaging-sw.js)

self.addEventListener('push', (event) => {
  console.log('[SW] Notificación push recibida');

  let datos = {
    titulo: '📋 Lab.Rosas',
    cuerpo: 'Tienes una notificación pendiente',
    icono: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'labrosas-push',
    url: '/ordenes'
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      datos = { ...datos, ...payload };
    } catch {
      datos.cuerpo = event.data.text() || datos.cuerpo;
    }
  }

  const opciones = {
    body: datos.cuerpo,
    icon: datos.icono,
    badge: datos.badge,
    tag: datos.tag,
    data: { url: datos.url },
    requireInteraction: false,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'ver', title: '👁️ Ver' },
      { action: 'cerrar', title: '✕ Cerrar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(datos.titulo, opciones)
  );
});

// ─── Click en notificación ────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Click en notificación:', event.notification.tag);

  const accion = event.action;
  event.notification.close();

  if (accion === 'cerrar') return;

  const urlDestino = event.notification.data?.url || '/ordenes';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            if ('navigate' in client) {
              return client.navigate(urlDestino);
            }
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlDestino);
        }
      })
  );
});

// ─── Cierre de notificación ───────────────────────────────────────────────────

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificación cerrada:', event.notification.tag);
});

// ─── Mensajes desde la app Angular ───────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Mostrar notificación programada enviada desde la app
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { titulo, cuerpo, tag, url } = event.data;
    self.registration.showNotification(titulo || '📋 Lab.Rosas', {
      body: cuerpo || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: tag || `sw-notif-${Date.now()}`,
      data: { url: url || '/ordenes' },
      vibrate: [150, 80, 150]
    });
  }
});

// ─── Fetch (network-first para API, cache-first para assets) ─────────────────

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // No interceptar peticiones a la API ni a Firebase
  if (url.pathname.startsWith('/api')) return;
  if (url.hostname.includes('firebase') || url.hostname.includes('google')) return;
  if (url.pathname === '/firebase-messaging-sw.js') return;

  // Para el resto, intentar red primero, caché como fallback
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    )
  );
});
