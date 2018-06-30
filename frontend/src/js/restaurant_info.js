import DBHelper from './dbhelper';
import L from 'leaflet';

// LEAFLET SETTINGS:

// tells Leaflet were to find its images
L.Icon.Default.imagePath = 'img/leaflet/';

// workaround to avoid Chrome scrolling to the focused item
L.Control.include({
  _refocusOnMap: L.Util.falseFn // Do nothing.
});

let restaurant;
let newMap;

/**
 * Register service worker
 */
if (navigator.serviceWorker) {
  navigator.serviceWorker.register('service_worker.js');
}

/**
 * Initialize Mapbox + Leaflet map.
 */
// Replaced GMaps with Mapbox + Leaflet
// window.initMap = () => {
//   fetchRestaurantFromURL((error, restaurant) => {
//     if (error) { // Got an error!
//       console.error(error);
//     } else {
//       self.map = new google.maps.Map(document.getElementById('map'), {
//         zoom: 16,
//         center: restaurant.latlng,
//         scrollwheel: false
//       });
//       fillBreadcrumb();
//       DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
//     }
//   });
// };
document.addEventListener('DOMContentLoaded', () => {
  initMap();
});

const initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error('fetchRestaurantFromURL() got an error:', error);
    } else {
      const map = document.getElementById('map');
      const mapHeight = map.clientHeight;
      self.newMap = L.map(map, {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      const tileLayer = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1IjoidGhvbWFzaW9tbWkiLCJhIjoiY2ppZGU1bXY1MDFkZjN5b2NyOW9sZGJlZyJ9.q1R_4JfiQ0nEgjoDZDyI8Q',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'
      });
      tileLayer.addTo(self.newMap);

      // reloads the map tileLayer just after it has finished loading if the map element has changed its height,
      // it's a workaround needed due to the fact that (probably) when initMap() is called, css/flexbox has not already calculated
      // the exact height of the map container
      tileLayer.on('load', () => {
        const mapHeightAfterLoad = map.clientHeight;
        if (mapHeight !== mapHeightAfterLoad)
          self.newMap.invalidateSize();
      });

      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
};

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant);
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    callback('No restaurant id in URL', null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error("DBHelper.fetchRestaurantById() got an error:", error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
};

/**
 * Create restaurant HTML and add it to the webpage.
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const favButton = document.getElementById('restaurant-favorite');
  const isFavorite = restaurant.is_favorite;
  favButton.innerHTML = `${isFavorite 
    ? '<span role="img" aria-label="">❌</span> Unfavorite' 
    : '<span role="img" aria-label="">★</span> Favorite!'}`;
  favButton.title = `${isFavorite
    ? 'Remove from'
    : 'Add to'} favorites`;
  favButton.onclick = () => toggleFavorite(restaurant);

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  image.title = restaurant.name;
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  // NOTE: edited the db on the server on localDiskDb.db inserting reasonable alt properties,
  // if these alt tags aren't present fallback on restaurant name
  image.alt = restaurant.alt ? restaurant.alt : restaurant.name;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
};

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review) => {
  const li = document.createElement('li');
  const header = document.createElement('div');
  header.className = 'header';
  const name = document.createElement('p');
  name.innerHTML = review.name;
  header.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = review.date;
  header.appendChild(date);

  li.appendChild(header);

  const rating = document.createElement('p');
  const starLabel = review.rating === 1 ? 'star' : 'stars';
  rating.innerHTML = `Rating: ${review.rating}<span role="img" aria-label="${starLabel}">★</span>`;
  rating.className = 'rating';
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  comments.className = 'comment';
  li.appendChild(comments);

  return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu.
 */
const fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = './restaurant.html?id=' + restaurant.id;
  a.setAttribute('aria-current', 'page');
  a.innerHTML = restaurant.name;
  li.appendChild(a);
  breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

/**
 * Toggle favorite flag on a restaurant.
 */
const toggleFavorite = (restaurant = self.restaurant) => {
  DBHelper.toggleFavoriteRestaurant(restaurant)
  .then(response => response.json())
  .then(updatedRestaurant => {
    const isFavorite = updatedRestaurant.is_favorite;
    console.info(`Restaurant ${isFavorite ? 'added to' : 'removed from'} favorites`);
    // Updates toggle button
    const favButton = document.getElementById('restaurant-favorite');
    favButton.innerHTML = `${isFavorite
      ? '<span role="img" aria-label="">❌</span> Unfavorite'
      : '<span role="img" aria-label="">★</span> Favorite!'}`;
    favButton.title = `${isFavorite
      ? 'Remove from'
      : 'Add to'} favorites`;
    favButton.onclick = () => toggleFavorite(updatedRestaurant);
  })
  .catch(err => {
    console.error('Impossible to add/remove restaurant to/from favorites!', err);
  });
};