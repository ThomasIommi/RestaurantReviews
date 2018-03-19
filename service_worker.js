self.addEventListener('fetch', (event) => {
  console.log(event.request.url);
});
self.addEventListener('install', (event) => {
  // TODO completare installazione service worker con fetch e caching!
});