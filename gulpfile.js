'use strict';

/* ==========================================================================
 Gulpfile

 Tasks:
 - gulp (builds for dev + watch)
 - gulp build (builds for prod)
 - gulp watch

 - gulp migrate
 - gulp cc (Clear Cache)
 - gulp fixperms
 - gulp maintenance
 - gulp apachectl
 ========================================================================== */


/* Setup Gulp
 ========================================================================== */
// Require
var gulp = require('gulp'),
    del = require('del'),
    fs = require('fs'),
    path = require('path'),
    rebase = require('rebase/tasks/gulp-rebase'),
    _ = require('lodash'),
    notifier = require('node-notifier'),
    runSequence = require('run-sequence'),
    express = require('express'),
    http = require('http'),
    open = require('open'),
    plugins = require('gulp-load-plugins')(),
    browserSync = require('browser-sync').create();


// Gulp Config
var showErrorNotifications = true,
    allowChmod = true;

// Project Config
var config = fs.readFileSync(path.resolve(__dirname, '.configrc'), 'UTF-8'),
    vars = JSON.parse(config).vars;

var resourcesPath = vars.resourcesPath;
var distPath = vars.distPath;

_.forEach(vars, function(value, key) {
    config = config.replace(new RegExp('\<\=\s*' + key + '\s*\>', 'ig'), value);
});

config = JSON.parse(config);




/* Errorhandling
 ========================================================================== */
var errorLogger, headerLines;

errorLogger = function(headerMessage,errorMessage){
    var header = headerLines(headerMessage);
    header += '\n             '+ headerMessage +'\n           ';
    header += headerLines(headerMessage);
    header += '\r\n \r\n';
    plugins.util.log(plugins.util.colors.red(header) + '             ' + errorMessage + '\r\n')

    if(showErrorNotifications){
        notifier.notify({
            'title': headerMessage,
            'message': errorMessage,
            'contentImage':  __dirname + "/gulp_error.png"
        });
    }
}

headerLines = function(message){
    var lines = '';
    for(var i = 0; i< (message.length + 4); i++){
        lines += '-';
    }
    return lines;
}




/* Add Async tag to script
 ========================================================================== */
var addAsyncTag = function (filepath, file, i, length) {
    if(config.js.addAsync === 'true') {
        return '<script src="' + filepath + '" async></script>';
    } else {
        return '<script src="' + filepath + '"></script>';
    }
}




/* Styles
 ========================================================================== */
gulp.task('styles', function() {
    return gulp.src(config.scss)
        // Sass
        .pipe(plugins.sass())
        .on('error', function (err) {
            errorLogger('SASS Compilation Error', err.message);
        })

        // Combine Media Queries
        .pipe(plugins.combineMq())

        // Prefix where needed
        .pipe(plugins.autoprefixer(config.browserSupport))

        // Minify output
        .pipe(plugins.cleanCss())

        // Rename the file to respect naming covention.
        .pipe(plugins.rename(function(path){
            path.basename += '.min';
        }))

        // Write to output
        .pipe(gulp.dest(config.dist.css))

        // Show total size of css
        .pipe(plugins.size({
            title: 'css'
        }));
});

gulp.task('inject-styles', ['styles'], function() {
    var files = gulp.src(config.css, {read: false});

    return gulp.src('web/*.html')
        // Inject
        .pipe(plugins.inject(files))

        //Rebase
        .pipe(rebase({
            link: {
                '(\/[^"]*\/)': 'frontend/css/'
            }
        }))

        // Write
        .pipe(gulp.dest('web/'));

});


/* Javascript
 ========================================================================== */
// Jshint
gulp.task('jshint', function() {
    return gulp.src([config.js.app, '!' + resourcesPath + '/ui/js/vendors/**/*.js'])
        // Jshint
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter(require('jshint-stylish')));
});


// Production
gulp.task('scripts-prod', ['jshint'], function() {
    return gulp.src(config.js.footer)
        // Uglify
        .pipe(plugins.uglify({
            mangle: {
                except: ['angular']
            }
        }))
        .on('error', function (err){
            errorLogger('Javascript Error', err.message);
        })

        // Concat
        .pipe(plugins.concat('app.min.js'))

        // Revision
        .pipe(plugins.rev())

        // Set destination
        .pipe(gulp.dest(config.dist.js))

        // Show total size of js
        .pipe(plugins.size({
            title: 'js'
        }));
});

gulp.task('inject-prod-scripts', ['scripts-prod'], function() {
    return gulp.src('/*.html')
        // Inject
        .pipe(plugins.inject(gulp.src(config.dist.js + '/**/*.js'), {
            transform: addAsyncTag,
            ignorePath: '/src'
        }))

        // Chmod for local use
        .pipe(plugins.if(allowChmod, plugins.chmod(777)))

        // Write
        .pipe(gulp.dest('web/'));
});


// Development
gulp.task('scripts-dev', ['jshint'], function() {
    return gulp.src(config.js.footer)
        // Flatten
        .pipe(plugins.flatten())

        // Write
        .pipe(gulp.dest(config.dist.js));
});

gulp.task('inject-dev-scripts', ['scripts-dev'], function() {
    var files = gulp.src(config.js.footer, {read: false});

    return gulp.src('web/*.html')
        // Inject
        .pipe(plugins.inject(files))

        //Rebase
        .pipe(rebase({
            script: {
                '(\/[^"]*\/)': 'frontend/js/'
            }
        }))

        // Write
        .pipe(gulp.dest('web/'));
});


/* Images
 ========================================================================== */
gulp.task('images', function() {
    return gulp.src(config.img)
        // Only optimize changed images
        .pipe(plugins.changed(config.dist.img))

        // Imagemin
        .pipe(plugins.imagemin({
            optimizationLevel: 3,
            progressive: true,
            svgoPlugins: [{
                removeViewBox: false
            }]
        }))

        // Set destination
        .pipe(gulp.dest(config.dist.img))

        // Show total size of images
        .pipe(plugins.size({
            title: 'images'
        }));
});

/* Fonts
 ========================================================================== */
gulp.task('fonts', function() {
    return gulp.src(config.fonts)
        // Set destination
        .pipe(gulp.dest(config.dist.fonts))

        // Show total size of fonts
        .pipe(plugins.size({
            title: 'fonts'
        }));
});

/* Clean/clear
 ========================================================================== */
gulp.task('clean', function(done) {
    return del([
        distPath + '**/**'
    ], done);
});

/* Webserver
 ========================================================================== */
//gulp.task('serve', function() {
//    var app = express();
//
//    app.use(express.static(__dirname + '/web'));
//
//    var server = http.createServer(app);
//    server.listen('8000', '0.0.0.0', function() {
//        open('http://0.0.0.0:8000');
//    });
//});

/* Browsersync
 ========================================================================== */
gulp.task('serve', function () {
    browserSync.init({
        server: {
            baseDir: 'web'
        }
    });

    gulp.watch(['web/*.html'], ['styles', 'images','inject-dev-scripts']); //html files van angular templates toevoegen en template cache task//
    gulp.watch([config.dist.css + '/*.css'], browserSync.reload);
    gulp.watch([config.scss], ['styles']);
    gulp.watch([config.js.app], ['inject-dev-scripts']);
    gulp.watch([config.img], ['images']);
});



/* Default tasks
 ========================================================================== */
// Watch
//gulp.task('watch', function() {
//    // Livereload
//    plugins.livereload.listen();
//    gulp.watch(config.liveReloadFiles).on('change', function(file) {
//        plugins.livereload.changed(file.path);
//    });
//
//    // Styles
//    gulp.watch(config.scss, ['styles']);
//
//    // Scripts
//    gulp.watch(config.js.app, ['inject-dev-scripts']);
//
//    // Images
//    gulp.watch(config.img, ['images']);
//});


// Build
gulp.task('build', function(done) {
    runSequence(
        'clean',
        ['styles', 'inject-prod-scripts', 'images', 'fonts'],
        done);
});

//gulp.task('default', [ 'clean', 'styles', 'inject-dev-scripts', 'images', 'fonts', 'watch', 'webserver'], function() {
//    //runSequence(
//    //    'clean',
//    //    ['styles', 'inject-dev-scripts', 'images', 'fonts'],
//    //    ['watch'],
//    //    done);
//});

gulp.task('default', function(done) {
    runSequence(
        'clean',
        ['inject-styles', 'inject-dev-scripts', 'images', 'fonts'],
        'serve',
        done);
});