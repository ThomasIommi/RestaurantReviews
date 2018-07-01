import DBHelper from './dbhelper';
import L from 'leaflet';
import DOMPurify from 'dompurify';

// LEAFLET SETTINGS:

// tells Leaflet were to find its images
L.Icon.Default.imagePath = 'img/leaflet/';

// workaround to avoid Chrome scrolling to the focused item
L.Control.include({
  _refocusOnMap: L.Util.falseFn // Do nothing.
});

let restaurant;
let reviews;
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
    DBHelper.fetchReviewsById(id, (error, reviews) => {
      self.reviews = reviews;
      if (!reviews) {
        console.error("DBHelper.fetchReviewsById() got an error:", error);
        return;
      }
      fillReviewsHTML();
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
    ? '<span role="img" aria-label="" aria-hidden="true">❌</span> Unfavorite' 
    : '<span role="img" aria-label="" aria-hidden="true">★</span> Favorite!'}`;
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

  // set restaurant_id input hidden for the review form
  const inputHidden = document.getElementById('form-review-id');
  inputHidden.value = restaurant.id;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
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
const fillReviewsHTML = (reviews = self.reviews) => {
  const container = document.getElementById('reviews-container');

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
  date.innerHTML = new Date(review.createdAt).toLocaleDateString();
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
      ? '<span role="img" aria-label="" aria-hidden="true">❌</span> Unfavorite'
      : '<span role="img" aria-label="" aria-hidden="true">★</span> Favorite!'}`;
    favButton.title = `${isFavorite
      ? 'Remove from'
      : 'Add to'} favorites`;
    favButton.onclick = () => toggleFavorite(updatedRestaurant);
  })
  .catch(error => {
    console.error('DBHelper.toggleFavoriteRestaurant() got an error:', error);
  });
};

/**
 * Clear form
 */
window.clearForm = () => {
  document.getElementById("add-review-form").reset();
};

/**
 * Validate and handle the POST submit of the review form to the server
 */
window.submitForm = (event, form) => {
  event.preventDefault();
  const formJson = purifyAndValidateForm(form);
  if (formJson) {
    DBHelper.submitReviewForm(formJson)
    .then(response => response.json())
    .then(review => {
      const ul = document.getElementById('reviews-list');
      ul.appendChild(createReviewHTML(review));
      console.info("New review added!");
      form.reset();
    })
    .catch(error => {
      console.error("DBHelper.submitReviewForm(): got an error:", error);
    });
  } else {
    // We should never have this alert (because of HTML 'required')
    alert("Form seems invalid! Check all fields are required!");
  }
  return false;
};

/**
 * Purify form against XSS attacks and creates a JSON to send to server
 */
const purifyAndValidateForm = (form) => {
  const restaurant_id_el = form.elements['restaurant_id']; // input hidden
  const name_el = form.elements['name'];
  const rating_el = form.elements['rating'];
  const comments_el = form.elements['comments'];
  const restaurant_id = parseInt(DOMPurify.sanitize(restaurant_id_el.value));
  const name = DOMPurify.sanitize(name_el.value);
  const rating = parseInt(DOMPurify.sanitize(rating_el.value));
  const comments = DOMPurify.sanitize(comments_el.value);

  if (!restaurant_id || !name || !rating || !comments)
    return false;

  const jsonObj = {restaurant_id, name, rating, comments};
  return JSON.stringify(jsonObj);
};