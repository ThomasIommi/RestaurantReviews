import idb from 'idb';

const staticName = 'restaurant-reviews-cache-v';
const version = 3;
const appCacheName = staticName+version;
const serverREST = 'http://localhost:1337';

// Create IDB restaurants database
const dbPromise = idb.open('restaurants-db', 1, upgradeDb => {
  switch (upgradeDb.oldVersion) {
    case 0:
      const restaurantStore = upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
      restaurantStore.createIndex('neighborhood', 'neighborhood');
      restaurantStore.createIndex('cuisine_type', 'cuisine_type');
    case 1:
      const reviewStore = upgradeDb.createObjectStore('reviews', {keyPath: 'id', autoIncrement:true});
      reviewStore.createIndex('restaurant_id', 'restaurant_id');
    // more cases as version increases
  }
});

// Start sync interval (15 seconds for testing purposes, maybe 30sec or 1min it's better?)
const syncIntervalID = setInterval(() => {
  console.info('Syncing...');
  syncClientServer();
}, 15000);

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
    'css/leaflet.css',
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
    'img/icons/app_icon_512.png',
    'img/icons/favorite.png', // from https://pixabay.com/it/uovo-uovo-cotto-pasto-2859327
    'img/leaflet/layers.png',
    'img/leaflet/layers-2x.png',
    'img/leaflet/marker-icon.png',
    'img/leaflet/marker-icon-2x.png',
    'img/leaflet/marker-shadow.png',
  ];
  // Arrays of request from web to cache (might fail)
  const urlsFromNet = [
    'https://fonts.gstatic.com/s/berkshireswash/v6/ptRRTi-cavZOGqCvnNJDl5m5XmN_pM4zT305QaYc.woff2', // Fonts from Google Fonts
    'https://fonts.gstatic.com/s/berkshireswash/v6/ptRRTi-cavZOGqCvnNJDl5m5XmN_qs4zT305QQ.woff2',
    'https://fonts.gstatic.com/s/greatvibes/v5/RWmMoKWR9v4ksMfaWd_JN9XLiaQoDmlrMlY.woff2',
    'https://fonts.gstatic.com/s/greatvibes/v5/RWmMoKWR9v4ksMfaWd_JN9XFiaQoDmlr.woff2'
  ];

  // Replaced GMaps with Mapbox + Leaflet
  // Google Map request (CORS problem)
  // const urlGMap = 'https://maps.googleapis.com/maps/api/js?libraries=places&callback=initMap';
  // Cache needed resources
  event.waitUntil(
    caches.open(appCacheName).then(cache => {
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

  // Fetch all restaurants and reviews from server and puts them into the IDB
  refreshRestaurants(true);
  refreshReviews();
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
  if (requestURL.origin === serverREST && dbPromise) {
    let id;

    //  --- GET requests handlers ---
    if (event.request.method === 'GET') {
      // All restaurants
      if (requestURL.pathname === '/restaurants') {
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
        refreshReviews();
        return;
      }
      // Gets a specific restaurant (if URL matches the exact regex)
      else if (requestURL.pathname.match(/^\/restaurants\/\d+$/)) {
        // Extract the restaurant id from the URL
        id = requestURL.pathname.substring(requestURL.pathname.lastIndexOf('/') + 1, requestURL.pathname.length);
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
      // Gets a specific restaurant reviews (if URL matches the exact regex)
      else if (requestURL.pathname === '/reviews/' && requestURL.search.match(/^\?restaurant_id=\d+$/)) {
        // Extract the restaurant id from the URL
        id = requestURL.search.substring(requestURL.search.lastIndexOf('=') + 1, requestURL.search.length);
        console.log(`Getting reviews for restaurant with id: ${id} from IDB`);
        event.respondWith(
          dbPromise.then(db => {
            const tx = db.transaction('reviews');
            const store = tx.objectStore('reviews');
            const index = store.index('restaurant_id');
            return index.getAll(parseInt(id));
          })
          .catch(err => {
            console.error(`Failed to retrive reviews for restaurant with id: ${id} from IDB`, err);
          })
          .then(reviews => {
            if (reviews) {
              return new Response(JSON.stringify(reviews), {
                headers: {
                  'content-type': 'application/json;charset=UTF-8'
                }
              });
            }
            else return fetch(event.request);
          })
        );
        refreshReviewsByRestaurantId(id);
        return;
      }
    }

    // --- PUT request handlers ---
    else if (event.request.method === 'PUT') {
      // favorite/unfavorite restaurant
      if (requestURL.pathname.match(/^\/restaurants\/\d+\/$/)) {
        // extract the restaurant id from the URL
        id = requestURL.pathname.split("/")[2];
        // try to do regular fetch, if it fails update IDB locally and respond anyway, then retry to sync server DB later
        // clone request to read its body
        const clonedRq = event.request.clone();
        event.respondWith(
          fetch(event.request)
          .then(response => {
            // clone response and update IDB
            const clonedResponse = response.clone();
            clonedResponse.json()
            .then(updatedRestaurant => {
              dbPromise.then(db => {
                const tx = db.transaction('restaurants', 'readwrite');
                const keyValStore = tx.objectStore('restaurants');
                keyValStore.put(updatedRestaurant);
                tx.complete;
              });
            });
            // then return the response
            return response;
          })
          .catch(() => {
            // Request failed, respond from cache and flag restaurant
            return clonedRq.json()
            .then(rqBody => {
              const favorite = rqBody.is_favorite;
              return dbPromise.then(db => {
                const tx = db.transaction('restaurants');
                const store = tx.objectStore('restaurants');
                return store.get(parseInt(id));
              })
              .then(restaurant => {
                if (restaurant) {
                  // set changes and out_of_sync flag and update IDB
                  restaurant.is_favorite = favorite;
                  restaurant.out_of_sync = true;
                  dbPromise.then(db => {
                    const tx = db.transaction('restaurants', 'readwrite');
                    const keyValStore = tx.objectStore('restaurants');
                    keyValStore.put(restaurant);
                    tx.complete;
                  });
                  // then return response
                  return new Response(JSON.stringify(restaurant), {
                    headers: {
                      'content-type': 'application/json;charset=UTF-8'
                    }
                  });
                } else {
                  throw new Error("Empty restaurant!");
                }
              })
              .catch(err => {
                console.error(`Failed to retrive restaurant with id: ${id} from IDB`, err);
              })
            })
          })
        );
        return;
      }
    }

    // --- POST request handlers
    else if (event.request.method === 'POST') {
      // Save reviews
      if (requestURL.pathname.match(/^\/reviews\/$/)) {
        // try to do regular fetch, if it fails update IDB locally and respond anyway, then retry to sync server DB later
        // clone request to read its body
        const clonedRq = event.request.clone();
        event.respondWith(
          fetch(event.request)
          .then(response => {
            // clone response and update IDB
            const clonedResponse = response.clone();
            clonedResponse.json()
            .then(newReview => {
              dbPromise.then(db => {
                const tx = db.transaction('reviews', 'readwrite');
                const keyValStore = tx.objectStore('reviews');
                keyValStore.put(newReview);
                tx.complete;
              });
            });
            // then return the response
            return response;
          })
          .catch(() => {
            // request failed, save partial data in cache and flag it
            return clonedRq.json()
            .then(review => {
              if (review) {
                // set changes and out_of_sync flag and update IDB
                review.out_of_sync = true;
                dbPromise.then(db => {
                  const tx = db.transaction('reviews', 'readwrite');
                  const keyValStore = tx.objectStore('reviews');
                  keyValStore.put(review);
                  tx.complete;
                });
                // then return response
                return new Response(JSON.stringify(review), {
                  headers: {
                    'content-type': 'application/json;charset=UTF-8'
                  }
                });
              } else {
                throw new Error("Empty review!");
              }
            })
            .catch(err => {
              console.error(`Failed to save partial review locally in IDB`, err);
            })
          })
        );
        return;
      }
    }
  }
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

/**
 * Fetches the rest server for updating IDB with restaurants (without overriding is_favourite if out_of_sync)
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
          if (!firstSave) {
            // avoid is_favorite override
            keyValStore.get(r.id)
            .then(oldRestaurant => {
              if (oldRestaurant && oldRestaurant.out_of_sync) {
                r.is_favorite = oldRestaurant.is_favorite;
                r.out_of_sync = true;
              }
              keyValStore.put(r);
              return tx.complete;
            })
          } else {
            keyValStore.put(r);
            return tx.complete;
          }
        }
      }
    }).then(() => {
      console.log(`All restaurants ${firstSave ? 'saved' : 'updated'} to IndexDB!`);
    });
  }).catch(err => {
    console.warn(`Failed to ${firstSave ? 'save' : 'update'} all restaurants in IndexDB!`, err);
  });
};

/**
 * Fetches the rest server for updating IDB with reviews
 */
const refreshReviews = () => {
  console.log(`Fetching network to save reviews data`);
  fetch(`${serverREST}/reviews`)
  .then(response => response.json())
  .then(reviews => {
    dbPromise.then(db => {
      const tx = db.transaction('reviews', 'readwrite');
      const keyValStore = tx.objectStore('reviews');
      if (reviews) {
        for (let r of reviews) {
          keyValStore.put(r);
        }
      }
      return tx.complete;
    }).then(() => {
      console.log(`All reviews saved to IndexDB!`);
    });
  }).catch(err => {
    console.warn(`Failed to save all reviews in IndexDB!`, err);
  });
};

/**
 * Fetches the rest server for updating IDB with a specific restaurant  (without overriding is_favourite if out_of_sync)
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
        // avoid is_favorite override
        keyValStore.get(restaurant.id)
        .then(oldRestaurant => {
          if (oldRestaurant && oldRestaurant.out_of_sync) {
            restaurant.is_favorite = oldRestaurant.is_favorite;
            restaurant.out_of_sync = true;
          }
          keyValStore.put(restaurant);
          return tx.complete;
        })
      }
    }).then(() => {
      console.log(`Restaurants with id: ${id} updated to IndexDB!`);
    });
  }).catch(err => {
    console.warn(`Failed to update restaurant with id: ${id} to IndexDB!`, err);
  });
};

/**
 * Fetches the rest server for updating IDB with reviews of a specific restaurant
 */
const refreshReviewsByRestaurantId = (id) => {
  console.log(`Fetching network to update reviews for the restaurant with id: ${id}`);
  fetch(`${serverREST}/reviews/?restaurant_id=${id}`)
  .then(response => response.json())
  .then(reviews => {
    dbPromise.then(db => {
      const tx = db.transaction('reviews', 'readwrite');
      const keyValStore = tx.objectStore('reviews');
      if (reviews) {
        for (let r of reviews) {
          keyValStore.put(r);
        }
      }
      return tx.complete;
    }).then(() => {
      console.log(`Reviews for restaurant with id: ${id} updated to IndexDB!`);
    });
  }).catch(err => {
    console.warn(`Failed to update reviews for restaurant with id: ${id} to IndexDB!`, err);
  });
};

/**
 * Function that check for out_of_sync entities and tryes to update them on the server
 */
const syncClientServer = () => {
  if (dbPromise) {
    syncRestaurant();
    syncReviews();
  }
};

/**
 * Tries to sync restaurant to server
 */
const syncRestaurant = () => {
  dbPromise.then(db => {
    const tx = db.transaction('restaurants');
    const store = tx.objectStore('restaurants');
    store.getAll()
    .then(restaurants => {
      if (restaurants) {
        for (let rest of restaurants) {
          if (rest.out_of_sync) {
            fetch(`${serverREST}/restaurants/${rest.id}/`, {
              method: 'PUT',
              body: JSON.stringify({is_favorite: rest.is_favorite})
            })
            .then(response => response.json())
            .then(updatedRestaurant => {
              const tx = db.transaction('restaurants', 'readwrite');
              const store = tx.objectStore('restaurants');
              store.put(updatedRestaurant);
              console.info(`Restaurant of id: ${updatedRestaurant.id} synced with server!`);
              return tx.complete;
            })
          }
        }
      }
    });
  });
};

/**
 * Tries to sync reviews to server
 */
const syncReviews = () => {
  dbPromise.then(db => {
    const tx = db.transaction('reviews');
    const store = tx.objectStore('reviews');
    store.getAll()
    .then(reviews => {
      if (reviews) {
        for (let rev of reviews) {
          if (rev.out_of_sync) {
            delete rev.out_of_sync;
            fetch(`${serverREST}/reviews/`, {
              method: 'POST',
              body: JSON.stringify(rev)
            })
            .then(response => response.json())
            .then(updatedReview => {
              const tx = db.transaction('reviews', 'readwrite');
              const store = tx.objectStore('reviews');
              store.put(updatedReview);
              console.info(`Review of id: ${updatedReview.id} synced with server!`);
              return tx.complete;
            })
          }
        }
      }
    });
  });
};
