# Restaurant Reviews

**Restaurant Reviews** is a project realized for the "Mobile Web Specialist Certification Course" held by Udacity and Google;
 it is divided into 3 stages.
The goal of the project it's to incrementally convert a static webpage to a mobile-ready web application.

## Stage 1

In Stage One, the goal is to take a static design that lacks **accessibility** and convert the design to be **responsive**
 on different sized displays and accessible for screen reader use.
It is also necessary to add a **service worker** to begin the process of creating a seamless offline experience for users. 

## Stage 2

In Stage Two, the goal is to take the responsive, accessible design built in Stage One and connect it to an external 
server.

**NOTE:** to better divide the app from the server were created two folders: 
* fontend
* server

Inside *frontend/* there is the main app, inside *server/* obviously the server.

To meet Stage Two requirements, instead of getting data directly form a JSON resource of the app, the goal is to get all 
the informations required by using asynchronous JavaScript to request JSON data from the server. 
Then store the data received from the server in an offline database using IndexedDB, which will create an app shell 
architecture.
Finally, optimize the app to meet performance benchmarks made with Lighthouse:
* Performance > 70
* Accessibility > 90
* Progessive Web App > 90

**NOTE FOR REVIEWERS**: As suggested in */frontend/resources/audits/stage2/* there are 2 screenshots of Lighthouse audits, one with
3G connection and CPU slowdown, the other in no throttling mode. BTW Thank you for the tips and tricks!

## Stage 3

In Stage Three, the goal is to add a form to allow users to create their own reviews: 
The form includes the user’s name, the restaurant id, the user’s rating, and whatever comments he have. 
Submitting the form should update the server when the user is online.

If the user is not online, the app should notify the user that they are not connected, and save the users' data to submit automatically when re-connected. 
In this case, the review should be deferred and sent to the server when connection is re-established (but the review should still be visible locally even before it gets to the server.)

Users are also able to mark a restaurant as a favorite, this toggle is visible in the application.

In addition to adding new features, the performance targets met in Stage Two have tightened. 
* Performance > 90
* Accessibility > 90
* Progressive Web App > 90

**NOTE FOR REVIEWERS**: As for Stage 2 in */frontend/resources/audits/stage3/* there are 4 screenshots of Lighthouse audits, made with
different settings of network and cpu slowdown and caching active or not.

### Installation

This app requires [Node.js](https://nodejs.org/) and [NPM](https://www.npmjs.com/) to be installed.

#### Frontend application:

Install the app by moving into his folder: *frontend/* and running the following comand: 

`$ npm install` or `$ npm i`

it should install all the package and dependecies required for this app to be built, run and tested, like:

* [Gulp](https://gulpjs.com/)
* [Browserify](http://browserify.org/)
* [Babelify](https://github.com/babel/babelify)
* [IDB promised](https://github.com/jakearchibald/idb)
* [Gulp-uglify-es](https://www.npmjs.com/package/gulp-uglify-es)
* [Gulp-autoprefixer](https://www.npmjs.com/package/gulp-autoprefixer)
* [Browser-sync](https://browsersync.io/)
* [DOMPurify](https://github.com/cure53/DOMPurify)
* etc...

Finally there are some node script that can be lunched in order to build the app:

* `$ npm run build-watch`, generates the *frontend/dist/* folder with all the files needed by the app
bundled together, minified and uglified when possible and starts a server at localhost:8000 to test the app in production mode;
any change made to the source files in *frontend/src/* start a gulp task to try to refresh the server.

* `$ npm run dev-watch`, is the same as previous scripts, except that it creates a development environment instead of a production one, 
meaning that source files are copied instead of being minified and uglified (since it's faster and devs makes changes very often :) ).

* `$ npm run build`, builds the *frontend/dist/* folder with all the files 
needed by the app bundled together, minified and uglified when possible, but avoids starting and watching the server.

* `$ npm run dev`, generates the *frontend/dist/* folder with all the files 
needed by the app in development mode (no minification).

#### Server:

Refer to server README.md in *server/README.md*

#### Run the app

1. Simply use the following scripts: `$ npm start`, `$ npm run build-watch` for production or `$ npm run dev-watch` for
development and the *Gulp* script will build the app and run *browser-sync* automatically.

or

1. Run the commands `$ npm run build` for production, `$ npm run dev` for development.
2. Move into the new created folder *frontend/dist/*
3. Start up a simple HTTP server to serve up the site files on your local computer. 
Python has some simple tools to do this. In a terminal, check the version of Python you have: `python -V`. 
If you have Python 2.x, spin up the server with `python -m SimpleHTTPServer 8000` (or some other port, if port 8000 is 
already in use.) 
For Python 3.x, you can use `python3 -m http.server 8000`. If you don't have Python installed, navigate to Python's 
[website](https://www.python.org/) to download and install the software.
4. With your server running, visit the site: `http://localhost:8000`.

### Note about ES6
Most of the code in this project has been written to the ES6 JavaScript specification for compatibility with modern web 
browsers and future proofing JavaScript code. 

But in order to be even more compatible and for using Node.js imports (like the IDB library), all the code is then transpiled to 
es5 with **Browserify** and **Babel** at build time.

### Responsive
The responsive grid layout of the page was created using only vanilla CSS3, media queries and flexbox
 (for more information see [here](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout/Basic_Concepts_of_Flexbox)).
Several style sheets are applied to breakpoints:
 - 0px to 540px
 - 541px to 720px
 - 721px to 880px
 - 881px to 1300px
 - 1301px onwards.
 
### Accessibility (a11y)
To grant accessibility to user with some sort of imparement were made some adjustments 
(following the [WCAG checklist](https://www.w3.org/TR/2006/WD-WCAG20-20060427/appendixB.html)):
 - added [ARIA](https://www.w3.org/TR/html-aria/) roles and labels to the HTML pages
 - added alt tags to every image
 - managed the tab control and created a button to skip navigation buttons and Mapbox map
  
### Service Worker
To guarantee the functioning of the application even offline, a service worker was introduced.
The service worker mainly deals with installing all the necessary requests needed for the application to work offline in 
the cache (with the cache API);
and then to intercept every fetch request of the application and decide if the response to that request is already saved 
and ready in cache.
It also clean the cache every time the application is updated. 

Super useful cookbook on the subject by Jake Archibald's blog ([here](https://jakearchibald.com/2014/offline-cookbook/))

###### XSS protection note

To protect versus XSS attacks there is an attempt to sanitize form inputs client side (with DOMPurify library), 
although this is not enough and another validation should take place server side!

