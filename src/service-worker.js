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
  // Activar inmediatamente sin esperar a que se cierren las pestañas anteriores
  // Activar inmediatamente sin esperar a que se cierren las pestañas
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
  // Tomar control de todas las pestañas abiertas inmediatamente
  self.clients.claim();
});

// ─── Notificaciones Push (Web Push estándar) ──────────────────────────────────
// Este handler procesa notificaciones push enviadas directamente via Web Push API
// (no las de Firebase, que son manejadas por firebase-messaging-sw.js)

self.addEventListener('push', (event) => {
  console.log('[SW] Notificación push recibida desde servidor');

  let datos = {
    titulo: '📋 Lab.Rosas',
    cuerpo: 'Tienes una notificación pendiente',
    icono: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'labrosas-push',
    url: '/ordenes',
    vibrate: [200, 100, 200]
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

// ─── Notificaciones programadas (desde la app via postMessage) ───────────────

self.addEventListener('message', (event) => {
  if (!event.data) return;

  const { tipo, titulo, cuerpo, tag, url } = event.data;

  if (tipo === 'MOSTRAR_NOTIFICACION') {
    const opciones = {
      body: cuerpo || 'Notificación de Lab.Rosas',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: tag || `labrosas-${Date.now()}`,
      data: { url: url || '/ordenes' },
      requireInteraction: false,
      vibrate: [200, 100, 200]
    };

    self.registration.showNotification(titulo || '📋 Lab.Rosas', opciones)
      .then(() => console.log('[SW] Notificación programada mostrada:', titulo))
      .catch(err => console.error('[SW] Error mostrando notificación:', err));
  }
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
    fetch(event.request)
      .then((response) => {
        // Cachear respuestas exitosas de navegación
        if (response.ok && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
  if (url.pathname.startsWith('/api') || url.origin !== self.location.origin) return;

  // Solo interceptar GET
  if (event.request.method !== 'GET') return;

  // Para el resto, intentar red primero, caché como fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cachear respuestas exitosas de assets estáticos
        if (response.ok && (
          url.pathname.endsWith('.js') ||
          url.pathname.endsWith('.css') ||
          url.pathname.endsWith('.ico') ||
          url.pathname.endsWith('.png') ||
          url.pathname.endsWith('.woff2')
        )) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
        caches.match(event.request).then(cached => {
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

