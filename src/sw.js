import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

// Injetado pelo vite-plugin-pwa em build time
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const SHARE_CACHE = 'share-target-v1';

// Trata requisições POST do share_target do PWA manifest
// O sistema operacional posta a imagem compartilhada em /register via multipart/form-data
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname !== '/register' || event.request.method !== 'POST') return;

  event.respondWith(
    (async () => {
      try {
        const formData = await event.request.formData();
        const image = formData.get('image');
        if (image instanceof File) {
          const arrayBuffer = await image.arrayBuffer();
          const cache = await caches.open(SHARE_CACHE);
          const storedResponse = new Response(arrayBuffer, {
            headers: {
              'Content-Type': image.type || 'image/jpeg',
              'X-File-Name': image.name || 'shared.jpg',
            },
          });
          await cache.put('/shared-image', storedResponse);
        }
      } catch (e) {
        console.warn('[SW] Erro ao processar share target:', e);
      }
      return Response.redirect('/register?share=true', 303);
    })()
  );
});
