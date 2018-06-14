import DBHelper from './dbhelper';
import lazyLoadImages from './lazy_load_images';
import L from 'leaflet';

// LEAFLET SETTINGS:

// tells Leaflet were to find its images
L.Icon.Default.imagePath = 'img/leaflet/';

// workaround to avoid Chrome scrolling to the focused item
L.Control.include({
  _refocusOnMap: L.Util.falseFn // Do nothing.
});

let restaurants,
  neighborhoods,
  cuisines;
let newMap;
let markers = [];

/**
 * Register service worker
 */
if (navigator.serviceWorker) {
  navigator.serviceWorker.register('service_worker.js');
}

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error("DBHelper.fetchNeighborhoods() got an error:", error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
};

/**
 * Set neighborhoods HTML.
 */
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error("DBHelper.fetchCuisines() got an error:", error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
};

/**
 * Set cuisines HTML.
 */
const fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

/**
 * Initialize Mapbox + Leaflet map, called from HTML.
 */
// Replaced GMaps with Mapbox + Leaflet
// window.initMap = () => {
//   let loc = {
//     lat: 40.722216,
//     lng: -73.987501
//   };
//   self.map = new google.maps.Map(document.getElementById('map'), {
//     zoom: 12,
//     center: loc,
//     scrollwheel: false
//   });
//   updateRestaurants();
// };
const initMap = () => {
  self.newMap = L.map('map', {
    center: [40.722216, -73.987501],
    zoom: 12,
    scrollWheelZoom: false
  });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1IjoidGhvbWFzaW9tbWkiLCJhIjoiY2ppZGU1bXY1MDFkZjN5b2NyOW9sZGJlZyJ9.q1R_4JfiQ0nEgjoDZDyI8Q',
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
    '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
    'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(self.newMap);

  updateRestaurants();
};

/**
 * Update page and map for current restaurants.
 * Note: Called from outside the bundle
 */
window.updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error("DBHelper.fetchRestaurantByCuisineAndNeighborhood() got an error:", error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';
  ul.style.display = 'none';
  // Remove 'No results found!' warning and results counter;
  const noResult = document.getElementById('no-results-warning');
  if (noResult) {
    noResult.remove();
  }
  const resultsCounter = document.getElementById('results-counter');
  if (resultsCounter) {
    resultsCounter.remove();
  }
  // Remove all map markers
  if (self.markers)
    self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  const container = document.getElementById('restaurant-list-container');
  // Add 'No results found!' in case of empty list
  if (!restaurants.length) {
    const noResults = document.createElement('p');
    noResults.innerHTML = 'No results found!';
    noResults.id = 'no-results-warning';
    noResults.setAttribute('aria-live', 'polite');
    container.append(noResults);
  } else {
    restaurants.forEach(restaurant => {
      ul.append(createRestaurantHTML(restaurant));
    });
    // Show list and result counter
    ul.style.display = 'flex';
    const resultsCounter = document.createElement('p');
    resultsCounter.innerHTML = `${restaurants.length} ${restaurants.length === 1 ? 'result' : 'results'} found!`;
    resultsCounter.id = 'results-counter';
    resultsCounter.setAttribute('aria-live', 'polite');
    container.append(resultsCounter);
    lazyLoadImages();
    addMarkersToMap();
  }
};

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img lazy-load';
  image.setAttribute('data-src', DBHelper.imageUrlForRestaurant(restaurant));
  image.src = DBHelper.previewImageUrlForRestaurant(restaurant);
  // NOTE: edited the db on the server on localDiskDb.db inserting reasonable alt attributes to the JSON,
  // if these alt tags aren't present fallback on restaurant name
  image.alt = restaurant.alt ? restaurant.alt : restaurant.name;
  image.title = restaurant.name;
  li.append(image);

  const wrapper = document.createElement('div');
  wrapper.className = 'wrapper';
  const name = document.createElement('h3');
  name.innerHTML = restaurant.name;
  wrapper.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  wrapper.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  wrapper.append(address);
  li.append(wrapper);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.setAttribute('aria-label', `View details of the ${restaurant.name} restaurant`);
  li.append(more);

  return li
};

/**
 * Add markers for current restaurants to the map.
 */
// Replaced GMaps with Mapbox + Leaflet
// const addMarkersToMap = (restaurants = self.restaurants) => {
//   restaurants.forEach(restaurant => {
//     // Add marker to the map
//     const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
//     google.maps.event.addListener(marker, 'click', () => {
//       window.location.href = marker.url
//     });
//     self.markers.push(marker);
//   });
// };
const addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
  });
};


