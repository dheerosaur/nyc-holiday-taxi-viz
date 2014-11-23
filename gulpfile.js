var gulp = require('gulp')
  , concat = require('gulp-concat')
  , uglify = require('gulp-uglify');

gulp.task('compress-css', function () {
  gulp.src([
    "public/css/leaflet.css",
    "public/css/bootstrap.min.css",
    "public/css/main.css"
    ])
    .pipe(concat('build.css'))
    .pipe(gulp.dest('public/dist/'));
});

gulp.task('compress-js', function () {
  gulp.src([
      "public/js/leaflet.js",
      "public/js/polyline.js",
      "public/js/underscore-min.js",
      "public/js/moment.min.js",
      "public/js/per_date.js",
      "public/js/main.js",
    ])
    .pipe(uglify())
    .pipe(concat('build.js'))
    .pipe(gulp.dest('public/dist/'));

});

gulp.task('watch', function() {
  gulp.watch('public/css/*.css', ['compress-css']);
  gulp.watch('public/js/*.js', ['compress-js']);
})

gulp.task('default', [
  'watch'
]);
