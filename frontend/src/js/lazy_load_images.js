export default function lazyLoadImages() {

  // Gets all images to lazy load
  const images = document.querySelectorAll('.lazy-load');

  let observer;

  /**
   * Function to understand what images are being displayed in the viewport
   * and call the relative handler to download and show them
   */
  const intersectionHandler = imgs => {
    imgs.forEach(img => {
      if (img.intersectionRatio > 0) {
        observer.unobserve(img.target);
        loadImage(img.target);
      }
    })
  };

  /**
   * Function that load the image from the network/cache and display it
   * @param image
   */
  const loadImage = (image) => {
    const src = image.dataset.src;
    fetch(src).then(() => {
      image.src = src;
      console.info('Lazy loaded image:', src);
    })
  };

  // If we don't have support for intersection observer, load the images immediately
  if (!('IntersectionObserver' in window)) {
    Array.from(images).forEach(image => loadImage(image));
  } else {
    // Sets the intersection observer to understand when an image is beeing displayed
    observer = new IntersectionObserver(intersectionHandler, {
      // Start the download when the image is 50px away from Y-axis end points
      rootMargin: '50px 0px',
      threshold: 0.01
    });
    // Call the observer for every image
    images.forEach(image => {
      observer.observe(image);
    });
  }

}

