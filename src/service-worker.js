/**
 * Service Worker — Lab.Rosas
 * Maneja notificaciones push, notificaciones programadas desde la app
 * y caché básico para funcionamiento offline.
 *
 * IMPORTANTE: Este SW permite que las notificaciones lleguen al celular
 * incluso cuando la app está en segundo plano, usando
 * ServiceWorkerRegistration.showNotification() desde el hilo principal.
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
  // Activar inmediatamente sin esperar a que se cierren las pestañas anteriores
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
            console.log('[SW] Eliminando caché antigua:', key);
            return caches.delete(key);
          })
      )
    )
  );
  // Tomar control de todas las pestañas abiertas inmediatamente
  self.clients.claim();
});

// ─── Notificaciones Push (desde servidor externo) ─────────────────────────────
// Estas llegan cuando hay un servidor de push configurado (VAPID).
// Por ahora las notificaciones se programan desde el hilo principal
// usando registration.showNotification(), que también pasa por este SW.

self.addEventListener('push', (event) => {
  console.log('[SW] Notificación push recibida desde servidor');

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
    vibrate: [200, 100, 200],
    actions: [
      { action: 'ver', title: '👁️ Ver orden' },
      { action: 'cerrar', title: '✕ Cerrar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(datos.titulo, opciones)
  );
});

// ─── Click en notificación ────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Click en notificación:', event.notification.tag, '| Acción:', event.action);
  event.notification.close();

  // Si el usuario hizo clic en "Cerrar", no navegar
  if (event.action === 'cerrar') return;

  const urlDestino = event.notification.data?.url || '/ordenes';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Buscar una ventana ya abierta con la misma URL base
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin) {
            client.focus();
            if ('navigate' in client) {
              return client.navigate(urlDestino);
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

  // No interceptar peticiones a la API ni a otros orígenes
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api')) return;

  // Para el resto, intentar red primero con fallback a caché
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cachear respuestas exitosas de navegación
        if (response.ok && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Para navegación, devolver el index.html cacheado (SPA fallback)
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('', { status: 503, statusText: 'Service Unavailable' });
        })
      )
  );
});

