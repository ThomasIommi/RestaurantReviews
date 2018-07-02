const gulp = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const browserSync = require('browser-sync').create();
const uglify = require('gulp-uglify-es').default;
const sourcemaps = require('gulp-sourcemaps');
const babelify = require('babelify');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const runSequence = require('run-sequence');
const del = require('del');
const jimp = require('gulp-jimp');
const rename = require('gulp-rename');

// 'dev-watch' as default task
gulp.task('default', ['dev-watch']);

// live editing script, sets watchers and browsersync for development
gulp.task('dev-watch', ['dev'], () => {
  gulp.watch('src/sass/**/*.scss', ['compile-scss'])
  .on('change', browserSync.reload);
  gulp.watch('src/*.html', ['copy-html'])
  .on('change', browserSync.reload);
  gulp.watch('src/**/*.js', ['bundle-js-dev'])
  .on('change', browserSync.reload);
  gulp.watch('src/manifest.json', ['copy-manifest'])
  .on('change', browserSync.reload);
  browserSync.init({
    server: 'dist/',
    port: 8000
  });
  browserSync.stream();
});

// live editing script, sets watchers and browsersync for production testing
gulp.task('prod-watch', ['prod'], () => {
  gulp.watch('src/sass/**/*.scss', ['compile-scss'])
  .on('change', browserSync.reload);
  gulp.watch('src/*.html', ['copy-html'])
  .on('change', browserSync.reload);
  gulp.watch('src/**/*.js', ['bundle-js-prod'])
  .on('change', browserSync.reload);
  gulp.watch('src/manifest.json', ['copy-manifest'])
  .on('change', browserSync.reload);
  browserSync.init({
    server: 'dist/',
    port: 8000
  });
  browserSync.stream();
});

// compiles sass style files and inserts vendor prefixes automatically
// with autoprefixer
// takes leaflet.css from node_modules also, converts it in scss and compress it in dist/css/
gulp.task('compile-scss', () => {
  gulp.src('src/sass/**/*.scss')
    .pipe(sass({outputStyle: 'compressed'})
      .on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['last 2 versions']
    }))
    .pipe(gulp.dest('dist/css/'));
  gulp.src('node_modules/leaflet/dist/leaflet.css')
    .pipe(rename("leaflet.scss"))
    .pipe(sass({outputStyle: 'compressed'})
    .on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['last 2 versions']
    }))
    .pipe(gulp.dest('dist/css/'));
});

// simply copies html files into dist folder
gulp.task('copy-html', () => {
  gulp.src('src/*.html')
    .pipe(gulp.dest('dist/'));
});

// simply copies manifest.json file into dist folder
gulp.task('copy-manifest', () => {
  gulp.src('src/manifest.json')
  .pipe(gulp.dest('dist/'));
});

// copies img files into dist folder, creates previews, manifest images and copies leaflet icons
gulp.task('copy-imgs', () => {
  // move images
  gulp.src(['resources/img/**', '!resources/img/icons/app_icon.png'])
  .pipe(gulp.dest('dist/img/'));
  // create previews
  gulp.src('resources/img/*.jpg')
  .pipe(jimp({
    '' : {
      scale: 0.1,
      blur: 60,
      type: 'jpg'
    }
  }))
  .pipe(gulp.dest('dist/img/previews/'));
  // create manifest images
  gulp.src('resources/img/icons/app_icon.png')
  .pipe(jimp({
    '_192' : {
      resize: { width: 192, height: 192 },
      type: 'png'
    },
    '_512' : {
      resize: { width: 512, height: 512 },
      type: 'png'
    }
  }))
  .pipe(gulp.dest('dist/img/icons/'));
  // copy leaflet icons
  gulp.src('node_modules/leaflet/dist/images/**.png')
  .pipe(gulp.dest('dist/img/leaflet/'))

});

// bundles js files for dev mode and copies them into dist folder
gulp.task('bundle-js-dev', ['bfy-main-dev', 'bfy-restaurant-dev', 'bfy-sw-dev']);

// bundles js files for prod mode, copies them into dist folder
gulp.task('bundle-js-prod', ['bfy-main-prod', 'bfy-restaurant-prod', 'bfy-sw-prod']);

// makes a bundle with browserify and babelify for the main page without uglify minification
gulp.task('bfy-main-dev', () => {
  return browserify({
    entries: 'src/js/main.js',
    debug: true
  })
  .transform(babelify)
  .bundle()
  .pipe(source('main_bundle.js'))
  .pipe(gulp.dest('dist/js/bundles'));
});

// makes a bundle with browserify, babelify and uglify for the main page
gulp.task('bfy-main-prod', () => {
  return browserify({
    entries: 'src/js/main.js',
    debug: true
  })
  .transform(babelify)
  .bundle()
  .pipe(source('main_bundle.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(uglify())
  .pipe(sourcemaps.write('/'))
  .pipe(gulp.dest('dist/js/bundles'));
});

// make a bundle with browserify and babelify for the restaurant details page without uglify minification
gulp.task('bfy-restaurant-dev', () => {
  return browserify({
    entries: 'src/js/restaurant_info.js',
    debug: true
  })
  .transform(babelify)
  .bundle()
  .pipe(source('restaurant_bundle.js'))
  .pipe(gulp.dest('dist/js/bundles'));
});

// make a bundle with browserify, babelify and uglify for the restaurant details page
gulp.task('bfy-restaurant-prod', () => {
  return browserify({
    entries: 'src/js/restaurant_info.js',
    debug: true
  })
  .transform(babelify)
  .bundle()
  .pipe(source('restaurant_bundle.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(uglify())
  .pipe(sourcemaps.write('/'))
  .pipe(gulp.dest('dist/js/bundles'));
});

// make a bundle with browserify and babelify for the service worker without uglify minification
gulp.task('bfy-sw-dev', () => {
  return browserify({
    entries: 'src/service_worker.js',
    debug: true
  })
  .transform(babelify)
  .bundle()
  .pipe(source('service_worker.js'))
  .pipe(gulp.dest('dist/'));
});

// make a bundle with browserify, babelify and uglify for the service worker
gulp.task('bfy-sw-prod', () => {
  return browserify({
    entries: 'src/service_worker.js',
    debug: true
  })
  .transform(babelify)
  .bundle()
  .pipe(source('service_worker.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(uglify())
  .pipe(sourcemaps.write('/'))
  .pipe(gulp.dest('dist/'));
});

// deletes dist folder
gulp.task('clean-dist', () => {
  return del('dist/**', {force:true});
});

// set of tasks for development environment
gulp.task('dev', (callback) => {
  runSequence(
    'clean-dist',
    ['compile-scss', 'copy-html', 'copy-manifest', 'copy-imgs', 'bundle-js-dev'],
    callback);
});

// set of tasks for production environment
gulp.task('prod', (callback) => {
  runSequence(
    'clean-dist',
    ['compile-scss', 'copy-html', 'copy-manifest', 'copy-imgs', 'bundle-js-prod'],
    callback);
});