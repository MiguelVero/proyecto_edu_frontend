/**
 * Service Worker — Lab.Rosas
 * Maneja notificaciones push y caché básico.
 */

const CACHE_NAME = 'labrosas-v1';
const APP_SHELL = ['/'];

// ─── Instalación ─────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
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
  console.log('[SW] Service Worker activado');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── Notificaciones Push ──────────────────────────────────────────────────────

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
    } catch (e) {
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
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(datos.titulo, opciones)
  );
});

// ─── Click en notificación ────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Click en notificación:', event.notification.tag);
  event.notification.close();

  const urlDestino = event.notification.data?.url || '/ordenes';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) {
              client.navigate(urlDestino);
            }
            return;
          }
        }
        // Si no hay ventana abierta, abrir una nueva
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

// ─── Fetch (network-first para API, cache-first para assets) ─────────────────

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // No interceptar peticiones a la API
  if (url.pathname.startsWith('/api')) return;

  // Para el resto, intentar red primero
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    )
  );
});
