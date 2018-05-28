const staticName = 'restaurant-reviews-cache-v';
const version = 1;
const appCacheName = staticName+version;

// Install service worker
self.addEventListener('install', (event) => {
  // Array of requests from server to cache
  const urlsFromApp = [
    'index.html',
    'restaurant.html',
    'css/styles.css',
    'css/style-medium.css',
    'css/style-large.css',
    'css/style-extralargea.css',
    'css/style-huge.css',
    'js/dbhelper.js',
    'js/main.js',
    'js/restaurant_info.js',
    'data/restaurants.json',
    'img/1.jpg',
    'img/2.jpg',
    'img/3.jpg',
    'img/4.jpg',
    'img/5.jpg',
    'img/6.jpg',
    'img/7.jpg',
    'img/8.jpg',
    'img/9.jpg',
    'img/10.jpg',
    'img/favicon.ico' // from FreeFavicon.com
  ];
  // Arrays of request from web to cache (might fail)
  const urlsFromNet = [
    'https://fonts.gstatic.com/s/berkshireswash/v6/ptRRTi-cavZOGqCvnNJDl5m5XmN_pM4zT305QaYc.woff2', // Fonts from Google Fonts
    'https://fonts.gstatic.com/s/berkshireswash/v6/ptRRTi-cavZOGqCvnNJDl5m5XmN_qs4zT305QQ.woff2',
    'https://fonts.gstatic.com/s/greatvibes/v5/RWmMoKWR9v4ksMfaWd_JN9XLiaQoDmlrMlY.woff2',
    'https://fonts.gstatic.com/s/greatvibes/v5/RWmMoKWR9v4ksMfaWd_JN9XFiaQoDmlr.woff2',
  ];
  // Google Map request (CORS problem)
  const urlGMap = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyBFwGq-5iMAMkyT0ZocrJUant2pL0aPVrE&libraries=places&callback=initMap';
  // Cache needed resources
  event.waitUntil(
    caches.open(appCacheName).then((cache) => {
      // Fetch net for Google Maps and cache it
      // (no need to clone the response if I don't return it)
      fetch(urlGMap, {mode : "no-cors"}).then((response) => {
        return cache.put(urlGMap, response)
      }).catch((err) => {
        console.warn('Failed to cache Google Maps API!', err);
      });
      // Install as not a dependency, from Jake Archibald - Offline Cookbook
      // https://jakearchibald.com/2014/offline-cookbook/#on-install-not-as-a-dependency
      cache.addAll(urlsFromNet).catch((err) => {
        console.warn('Failed to cache fonts!', err);
      });
      // Core dependencies
      return cache.addAll(urlsFromApp).catch((err) => {
        console.error("An error occurred during the installation of the service worker: ", err);
      });
    })
  );
});

// Clean cache after service worker updates
self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Search in all caches for cache of older versions
    caches.keys().then((allCacheNames) => {
      return Promise.all(
        allCacheNames.filter((cacheName) => {
          return cacheName.startsWith(staticName) && cacheName !== appCacheName;
        }).map((cacheName) =>  {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', function(event) {
  const requestURL = new URL(event.request.url);

  // Detect and trys to handle the restaurant details.
  if (requestURL.origin === location.origin && requestURL.pathname === '/restaurant.html') {
    event.respondWith(caches.match('/restaurant.html'));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});