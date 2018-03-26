# Restaurant Reviews

**Restaurant Reviews** is a project realized for the "Mobile Web Specialist Certification Course" held by Udacity and Google; it is divided into 3 stages.
The goal of the project it's to incrementally convert a static webpage to a mobile-ready web application.

## Stage 1

In Stage One, the goal is to take a static design that lacks **accessibility** and convert the design to be **responsive** on different sized displays and accessible for screen reader use.
It is also necessary to add a **service worker** to begin the process of creating a seamless offline experience for users. 

### Installation
1. In this folder, start up a simple HTTP server to serve up the site files on your local computer. 
Python has some simple tools to do this. In a terminal, check the version of Python you have: `python -V`. 
If you have Python 2.x, spin up the server with `python -m SimpleHTTPServer 8000` (or some other port, if port 8000 is already in use.) 
For Python 3.x, you can use `python3 -m http.server 8000`. If you don't have Python installed, navigate to Python's [website](https://www.python.org/) to download and install the software.
2. With your server running, visit the site: `http://localhost:8000`.

### Note about ES6
Most of the code in this project has been written to the ES6 JavaScript specification for compatibility with modern web browsers and future proofing JavaScript code. 

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
To grant accessibility to user with some sort of imparement were made some adjustments (following the [WCAG checklist](https://www.w3.org/TR/2006/WD-WCAG20-20060427/appendixB.html)):
 - added [ARIA](https://www.w3.org/TR/html-aria/) roles and labels to the HTML pages
 - added alt tags to every image
 - managed the tab control and created a button to skip navigation buttons and Google map
  
### Service Worker
To guarantee the functioning of the application even offline, a service worker was introduced.
The service worker mainly deals with installing all the necessary requests needed for the application to work offline in the cache (with the cache API);
and then to intercept every fetch request of the application and decide if the response to that request is already saved and ready in cache.
It also clean the cache every time the application is updated. 

Super useful cookbook on the subject by Jake Archibald's blog ([here](https://jakearchibald.com/2014/offline-cookbook/))

###### CORS request
Request from Cross Origin can't be cached in addAll() method even with mode: "no-cors" header. (Or I just failed at it! :D)
It was needed to fetch the request (with the no-cors header) on the net and only then clone the response and cache that instead.

###### Google Maps caching
For now only the main Google Maps API is cached (with the no-cors method), everything else isn't. So the map won't work offline!
That was necessary for the callback (initMap) that instantiates everything necessary for the app to work.

