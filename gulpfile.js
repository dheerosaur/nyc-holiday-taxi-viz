var gulp = require('gulp')
  , concat = require('gulp-concat')
  , uglify = require('gulp-uglify');

gulp.task('compress', function () {
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
    .pipe(gulp.dest('public/js/'));
});

gulp.task('watch', function() {
  gulp.watch('public/js/*.js', ['compress']);
})

gulp.task('default', ['compress', 'watch']);
