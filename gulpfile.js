var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var gutil = require('gulp-util');
var through = require('through2');
var del = require('del');
var clean = require('gulp-clean');
var gulpIgnore = require('gulp-ignore');

/*

(src=")(./../images/[a-z]{2}[0-9]{2}/)([a-z]{2}-)([0-9]{5})(.jpg)(")

 ||
 V

 width="100%" height="100%" class="lazyload" src="./../images/loading.jpg"
  data-src="$2resized/$3$4-1090px$5$6
  data-srcset="$2resized/$3$4-512px$5 512w,
  $2resized/$3$4-768px$5 768w,
  $2resized/$3$4-1090px$5 1090w"
  sizes="(min-width: 1218px) 1090px,
  (min-width: 768px) 87vw,
  89vw"

*/

gulp.task('create-thumbnails', function () {
  return gulp
    .src('source/images/HOWTO/{bd,tv}-*.jpg')
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
    .pipe(gulp.dest('source/images/HOWTO/src'))
});

gulp.task('enlarge-thumbnails', gulp.series('create-thumbnails', function() {
  return gulp
    .src('source/images/HOWTO/src/{bd,tv}-*.jpg')
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
    .pipe(gulp.dest('source/images/HOWTO/src', {overwrite: true}))
}));

gulp.task('thumbnails', gulp.series('enlarge-thumbnails', function() {
  return gulp
    .src('source/images/HOWTO/src/{bd,tv}-*.jpg')
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
    .pipe(gulp.dest('source/images/HOWTO/src', {overwrite: true}))
}));

gulp.task('move', function() {
  return gulp
  .src('source/images/HOWTO/!(*px|*header)*.png')
  .pipe(gulp.dest('../OCTOBACKUP/old-images/HOWTO'))
});

gulp.task('clean', function() {
  return del(['source/images/HOWTO/!(*px|*header)*.png']);
});

gulp.task('create-responsive', function () {
  return gulp
    .src('../OCTOBACKUP/OLD IMAGES/**/*.jpg')
    .pipe(
      $.responsive(
        {
          // Resize all JPG images to three different sizes: 200, 500, and 630 pixels
          '**/*.jpg': [
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
          quality: 80,
          // Use progressive (interlace) scan for JPEG and PNG output
          progressive: true
        }
      )
    )
    .pipe(gulp.dest('../OCTOBACKUP/80 quality'))
});

gulp.task('resize', gulp.series('create-responsive', 'move', 'clean'));

gulp.task('resize-headers', function () {
  return gulp
    .src('source/images/VA31/*header.jpg')
    .pipe(
      $.responsive(
        {
          // Resize all JPG images to three different sizes: 200, 500, and 630 pixels
          '*.jpg':{
              width: 1090,
              //rename: { suffix: '-1090px'},
              //width: 1090,
              strictMatchImages: false
            }
        },
        {
          // Global configuration for all images
          quality: 80,
		      progressive: true,
		      withMetadata: false,
		      skipOnEnlargement: true,
		      errorOnUnusedConfig: false,
		      errorOnUnusedImage: false,
		      errorOnEnlargement: false
        }
      )
    )
    .pipe(gulp.dest('source/images/VA31'))
});

gulp.task('count', function() {
  return gulp.src('source/images/HOWTO/!(*px|*headerJP)*.jpg')
    .pipe((function() {
      return new through.obj(function(file, enc, next) {
        gutil.log(file.path);
        this.push(file);
        next();
      });
    })());
});