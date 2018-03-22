const staticName = 'restaurant-reviews-cache-v';
const version = 1;
const appCacheName = staticName+version;

// Install service worker
self.addEventListener('install', (event) => {
  // Array of requests to cache
  const urlsToCache = [
      'https://fonts.googleapis.com/css?family=Berkshire+Swash|Great+Vibes',
      '/',
      '/restaurant.html',
      'css/styles.css',
      'css/style-medium.css',
      'css/style-large.css',
      'css/style-extralarge.css',
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
  ];
  // Cache needed resources
  event.waitUntil(
    caches.open(appCacheName).then((cache) => {
      return cache.addAll(urlsToCache).catch((err) => {
        console.log("An error occurred during the installation of the service worker: " + err);
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

/**
 * Function that detect and trys to handle the restaurant details
  */
function handleRestaurantDetails(request) {
  const requestURL = new URL(request.url);
  const urlNoParams = requestURL.origin+requestURL.pathname;
  // Handle offline request to specific restaurant details from cache
  // (it gets the parameters anyway from the url of the request, that does not change)
  if (urlNoParams === location.origin+'/restaurant.html') {
    return fetch(urlNoParams);
  }
  return fetch(request);
}

// Intercept requests and check if they are cached
self.addEventListener('fetch', (event) => {
  // Respond from cache if there is the requested resource
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || handleRestaurantDetails(event.request);
    })
  );
});