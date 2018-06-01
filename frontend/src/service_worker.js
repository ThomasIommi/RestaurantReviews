import idb from 'idb';

const staticName = 'restaurant-reviews-cache-v';
const version = 2;
const appCacheName = staticName+version;
const serverREST = 'http://localhost:1337';

// Create IDB restaurants database
const dbPromise = idb.open('restaurants-db', 1, upgradeDb => {
  switch (upgradeDb.oldVersion) {
    case 0:
      const store = upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
      store.createIndex('neighborhood', 'neighborhood');
      store.createIndex('cuisine_type', 'cuisine_type');
    // more cases as version increases
  }
});

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
    'img/1.jpg', 'img/previews/1.jpg',
    'img/2.jpg', 'img/previews/2.jpg',
    'img/3.jpg', 'img/previews/3.jpg',
    'img/4.jpg', 'img/previews/4.jpg',
    'img/5.jpg', 'img/previews/5.jpg',
    'img/6.jpg', 'img/previews/6.jpg',
    'img/7.jpg', 'img/previews/7.jpg',
    'img/8.jpg', 'img/previews/8.jpg',
    'img/9.jpg', 'img/previews/9.jpg',
    'img/10.jpg', 'img/previews/10.jpg',
    'img/no_photo.jpg', 'img/previews/no_photo.jpg', // from https://commons.wikimedia.org/wiki/File:Emojione_1F374.svg edited with Krita
    'img/icons/favicon.ico', // from FreeFavicon.com
    'img/icons/app_icon_192.png', // from https://it.wikipedia.org/wiki/File:Emojione_1F355.svg
    'img/icons/app_icon_512.png'
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
  // Fetch all restaurants from server and puts them into the IDB
  refreshRestaurants(true);
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
    if (requestURL.pathname === '/restaurants' && dbPromise) {
      // Gets all restaurants from IDB and return them, then fetch the net for updates to save
      // on IDB for future requests
      console.log('Getting all restaurants from IDB');
      event.respondWith(
        dbPromise.then(db => {
          const tx = db.transaction('restaurants');
          const store = tx.objectStore('restaurants');
          return store.getAll();
        })
        .catch(err => {
          console.error('Failed to retrive restaurants from IDB', err);
        })
        .then(restaurants => {
          if (restaurants) {
            return new Response(JSON.stringify(restaurants), {
              headers: {
                'content-type': 'application/json;charset=UTF-8'
              }
            });
          }
          else return fetch(event.request);
        })
      );
      refreshRestaurants(false);
      return;
    }
    // Gets a specific restaurant (if URL matches the exact regex)
    else if (requestURL.pathname.match(/^\/restaurants\/\d+$/) && dbPromise) {
      // Extract the restaurant id from the URL
      const id = requestURL.pathname.substring(requestURL.pathname.lastIndexOf('/') + 1, requestURL.pathname.length);
      console.log(`Getting restaurant with id: ${id} from IDB`);
      event.respondWith(
        dbPromise.then(db => {
          const tx = db.transaction('restaurants');
          const store = tx.objectStore('restaurants');
          return store.get(parseInt(id));
        })
        .catch(err => {
          console.error(`Failed to retrive restaurant with id: ${id} from IDB`, err);
        })
        .then(restaurant => {
          if (restaurant) {
            return new Response(JSON.stringify(restaurant), {
              headers: {
                'content-type': 'application/json;charset=UTF-8'
              }
            });
          }
          else return fetch(event.request);
        })
      );
      refreshRestaurant(id);
      return;
    }
  }
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});

/**
 * Fetches the rest server for updating IDB with restaurants
 */
const refreshRestaurants = (firstSave) => {
  console.log(`Fetching network to ${firstSave ? 'save' : 'update'} restaurants data`);
  fetch(`${serverREST}/restaurants`)
  .then(response => response.json())
  .then(restaurants => {
    dbPromise.then(db => {
      const tx = db.transaction('restaurants', 'readwrite');
      const keyValStore = tx.objectStore('restaurants');
      if (restaurants) {
        for (let r of restaurants) {
          keyValStore.put(r);
        }
      }
      return tx.complete;
    }).then(() => {
      console.log(`All restaurants ${firstSave ? 'saved' : 'updated'} to IndexDB!`);
    });
  }).catch(err => {
    console.warn(`Failed to ${firstSave ? 'save' : 'update'} all restaurants in IndexDB!`, err);
  });
};

/**
 * Fetches the rest server for updating IDB with a specific restaurant
 */
const refreshRestaurant = (id) => {
  console.log(`Fetching network to update restaurant with id: ${id}`);
  fetch(`${serverREST}/restaurants/${id}`)
  .then(response => response.json())
  .then(restaurant => {
    dbPromise.then(db => {
      const tx = db.transaction('restaurants', 'readwrite');
      const keyValStore = tx.objectStore('restaurants');
      if (restaurant) {
        keyValStore.put(restaurant);
      }
      return tx.complete;
    }).then(() => {
      console.log(`Restaurants with id: ${id} updated to IndexDB!`);
    });
  }).catch(err => {
    console.warn(`Failed to update restaurant with id: ${id} to IndexDB!`, err);
  });
};