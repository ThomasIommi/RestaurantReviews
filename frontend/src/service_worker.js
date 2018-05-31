import idb from 'idb';

const staticName = 'restaurant-reviews-cache-v';
const version = 1;
const appCacheName = staticName+version;
const serverREST = 'http://localhost:1337';
let dbPromise;

// Install service worker
self.addEventListener('install', event => {
  // Array of requests from server to cache
  const urlsFromApp = [
    '/',
    '/restaurant.html',
    'css/styles.css',
    'css/style_medium.css',
    'css/style_large.css',
    'css/style_extralarge.css',
    'css/style_huge.css',
    'js/bundles/main_bundle.js',
    'js/bundles/restaurant_bundle.js',
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
    caches.open(appCacheName).then(cache => {
      // Fetch net for Google Maps and cache it
      // (no need to clone the response if I don't return it)
      fetch(urlGMap, {mode : "no-cors"}).then(response => {
        return cache.put(urlGMap, response)
      })
      .then(() => {
        console.log('Google Maps API cached with success!')
      })
      .catch((err) => {
        console.warn('Failed to cache Google Maps API!', err);
      });
      // Install as not a dependency, from Jake Archibald - Offline Cookbook
      // https://jakearchibald.com/2014/offline-cookbook/#on-install-not-as-a-dependency
      cache.addAll(urlsFromNet)
      .then(() => {
        console.log('Fonts cached with success!');
      })
      .catch(err => {
        console.warn('Failed to cache fonts!', err);
      });
      // Core dependencies
      return cache.addAll(urlsFromApp)
      .then(() => {
        console.log('App resources cached with success');
      })
      .catch(err => {
        console.error('Failed to cache app resources!', err);
      });
    })
  );
  // Create IDB restaurants database
  dbPromise = openDatabase();
  // Fetch all restaurants from server and puts them into the IDB
  fetch(`${serverREST}/restaurants`)
  .then(response => response.json())
  .then(restaurants => {
    dbPromise.then(db => {
      const tx = db.transaction('restaurants', 'readwrite');
      const keyValStore = tx.objectStore('restaurants');
      for (let r of restaurants) {
        keyValStore.put(r);
      }
      return tx.complete;
    }).then(() => {
      console.log('All restaurants added to IndexDB!');
    });
  }).catch(err => {
    console.warn('Failed to save all restaurants in IndexDB!', err);
  });
});

// Clean cache after service worker updates
self.addEventListener('activate', event => {
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

self.addEventListener('fetch', event => {
  const requestURL = new URL(event.request.url);
  // Detect and trys to handle the restaurant details.
  if (requestURL.origin === location.origin && requestURL.pathname === '/restaurant.html') {
    event.respondWith(caches.match('/restaurant.html'));
    return;
  }
  // Detect and trys to handle restaurants json requests with IDB.
  if (requestURL.origin === serverREST) {
    // All restaurants
    if (requestURL.pathname === '/restaurants') {
      //TODO
      console.log('richiesti TUTTI');
    }
    // A specific restaurant (if URL matches the exact regex)
    else if (requestURL.pathname.match(/^\/restaurants\/\d+$/)) {
      //TODO
      console.log('ristorante specifico');
    }
  }
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});

const openDatabase = () => {
  // Creates restaurants idb with unique key "id" and indexed by "neighborhood" and "cuisine_type"
  return idb.open('restaurants-db', 1, upgradeDb => {
    switch (upgradeDb.oldVersion) {
      case 0:
        const store = upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
        store.createIndex('neighborhood', 'neighborhood');
        store.createIndex('cuisine_type', 'cuisine_type');
      // more cases as version increases
    }
  });
};