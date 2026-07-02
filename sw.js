importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

if (workbox) {
  console.log(`Yay! Workbox is loaded 🎉`);
  
  // Set precache and route
  workbox.precaching.precacheAndRoute([
    { url: '/index.html', revision: '1' },
    { url: '/manifest.json', revision: '1' },
    { url: '/assets/css/styles.css', revision: '1' },
    { url: '/assets/js/core/app.js', revision: '1' },
    { url: '/assets/js/core/config.js', revision: '1' },
    { url: '/assets/js/core/utils.js', revision: '1' },
    { url: '/assets/js/services/camera.service.js', revision: '1' },
    { url: '/assets/js/services/detection.service.js', revision: '1' },
    { url: '/assets/js/services/facts.service.js', revision: '1' },
    { url: '/assets/js/ui/ui.handler.js', revision: '1' },
    { url: '/model/model.json', revision: '1' },
    { url: '/model/metadata.json', revision: '1' },
    { url: '/model/weights.bin', revision: '1' },
    { url: '/assets/icons/icon-192x192.png', revision: '1' },
    { url: '/assets/icons/apple-touch-icon.png', revision: '1' }
  ]);

  // Route for model bin files to be cached safely
  workbox.routing.registerRoute(
    ({request}) => request.destination === 'script' || request.destination === 'style',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'static-resources',
    })
  );
  
} else {
  console.log(`Boo! Workbox didn't load 😬`);
}
