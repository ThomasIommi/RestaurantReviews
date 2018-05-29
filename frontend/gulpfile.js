const gulp = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const browserSync = require('browser-sync').create();
const uglify = require('gulp-uglify-es').default;
const sourcemaps = require('gulp-sourcemaps');
const babelify = require('babelify');
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const runSequence = require('run-sequence');
const del = require('del');

// live editing script, sets watchers and browsersync
gulp.task('default', ['dev'], () => {
  gulp.watch('src/sass/**/*.scss', ['compile-scss'])
    .on('change', browserSync.reload);
  gulp.watch('src/*.html', ['copy-html'])
    .on('change', browserSync.reload);
  gulp.watch('src/**/*.js', ['copy-js'])
    .on('change', browserSync.reload);
  browserSync.init({
    server: 'dist/',
    port: 8000
  });
  browserSync.stream();
});

// compiles sass style files and insert vendor prefixes automatically
// with autoprefixer
gulp.task('compile-scss', () => {
  gulp.src('src/sass/**/*.scss')
    .pipe(sass({outputStyle: 'compressed'})
      .on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['last 2 versions']
    }))
    .pipe(gulp.dest('./dist/css/'));
});

// simply copies html files into dist folder
gulp.task('copy-html', () => {
  gulp.src('src/*.html')
    .pipe(gulp.dest('./dist/'));
});

// simply copies js files into dist folder
gulp.task('copy-js', ['browserify-idb'], () => {
  gulp.src(['src/**/*.js', '!src/js/ES6_imports/*.js'])
    .pipe(gulp.dest('./dist/'));
});

// simply copies img files into dist folder
gulp.task('copy-imgs', () => {
  gulp.src('resources/img/**')
  .pipe(gulp.dest('./dist/img/'));
});

// minifies all js files keeping trace of their structure with sourcemaps
// in a specific folder named 'sourcemaps' that is required only in debugging
gulp.task('uglify', ['browserify-idb'], () => {
  gulp.src(['src/**/*.js', '!src/js/ES6_imports/*.js'])
  .pipe(sourcemaps.init())
  .pipe(uglify())
  .pipe(sourcemaps.write('sourcemaps/'))
  .pipe(gulp.dest('dist/'));
});

// handles ES6 imports for the use of IDB promised library (browserify+babelify)
gulp.task('browserify-idb', () => {
    return browserify({
      entries: './src/js/ES6_imports/idb.js',
      debug: true
    })
    .transform(babelify, {presets: ['env']})
    .bundle()
    .pipe(source('idb.bfy.js'))
    .pipe(gulp.dest('./src/js'));
});

// deletes dist folder
gulp.task('clean-dist', () => {
  return del('dist/**', {force:true});
});

// deletes browserified files
gulp.task('clean-browserified', () => {
  return del('src/js/**/*.bfy.js', {force:true});
});

// set of tasks for development environment
gulp.task('dev', (callback) => {
  runSequence(
    ['clean-dist', 'clean-browserified'],
    ['compile-scss', 'copy-html', 'copy-imgs', 'copy-js'],
    callback);
});

// set of tasks for production environment
gulp.task('prod', (callback) => {
  runSequence(
    ['clean-dist', 'clean-browserified'],
    ['compile-scss', 'copy-html', 'copy-imgs', 'uglify'],
    callback);
});