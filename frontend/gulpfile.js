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
  browserSync.init({
    server: 'dist/',
    port: 8000
  });
  browserSync.stream();
});

// compiles sass style files and inserts vendor prefixes automatically
// with autoprefixer
gulp.task('compile-scss', () => {
  gulp.src('src/sass/**/*.scss')
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

// simply copies img files into dist folder
gulp.task('copy-imgs', () => {
  gulp.src('resources/img/**')
  .pipe(gulp.dest('dist/img/'));
});

// bundles js files for dev mode and copies them and the service_worker.js file into dist folder
gulp.task('bundle-js-dev', ['bfy-main-dev', 'bfy-restaurant-dev', 'bfy-sw-dev']);

// bundles js files for prod mode, copies them and uglify the service_worker.js file into dist folder
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
    ['compile-scss', 'copy-html', 'copy-imgs', 'bundle-js-dev'],
    callback);
});

// set of tasks for production environment
gulp.task('prod', (callback) => {
  runSequence(
    'clean-dist',
    ['compile-scss', 'copy-html', 'copy-imgs', 'bundle-js-prod'],
    callback);
});