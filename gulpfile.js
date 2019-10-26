var gulp = require('gulp')
var $ = require('gulp-load-plugins')()


gulp.task('create-thumbnails', function () {
  return gulp
    .src('source/images/VA26/{bd,tv}-*.jpg')
    .pipe(
      $.responsive(
        {
          '*.jpg': {
            // Resize all JPG images to 200 pixels wide
            width: 128,
            height: 72
          }
        },
        {
          // Global configuration for all images
          // The output quality for JPEG, WebP and TIFF output formats
          quality: 80,
          // Use progressive (interlace) scan for JPEG and PNG output
          progressive: false
        }
      )
    )
    .pipe(gulp.dest('source/images/VA26/src'))
});

gulp.task('enlarge-thumbnails', gulp.series('create-thumbnails', function() {
  return gulp
    .src('source/images/VA26/src/{bd,tv}-*.jpg')
    .pipe(
      $.responsive(
        {
          '*.jpg': {
            width: 1090,
            height: 613,
            withoutEnlargement: false
          }
        },
        {
          quality: 1,
          progressive: true
        }
      )
    )
    .pipe(gulp.dest('source/images/VA26/src', {overwrite: true}))
}));

gulp.task('thumbnails', gulp.series('enlarge-thumbnails', function() {
  return gulp
    .src('source/images/VA26/src/{bd,tv}-*.jpg')
    .pipe(
      $.responsive(
        {
          '*.jpg': {
            blur: true,
            rename: {suffix: '-blur'}
          }
        }
      )
    )
    .pipe(gulp.dest('source/images/VA26/src', {overwrite: true}))
}));

gulp.task('resize', function () {
  return gulp
    .src('source/images/VA26/{bd,tv}-*.jpg')
    .pipe(
      $.responsive(
        {
          // Resize all JPG images to three different sizes: 200, 500, and 630 pixels
          '*.jpg': [
            {
              width: 512,
              rename: { suffix: '-512px' }
            },
            {
              width: 768,
              rename: { suffix: '-768px' }
            },
            {
              width: 1090,
              rename: { suffix: '-1090px' }
            }
          ]
        },
        {
          // Global configuration for all images
          // The output quality for JPEG, WebP and TIFF output formats
          quality: 70,
          // Use progressive (interlace) scan for JPEG and PNG output
          progressive: true
        }
      )
    )
    .pipe(gulp.dest('source/images/VA26/resized'))
});