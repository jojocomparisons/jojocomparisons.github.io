module.exports = function (grunt) {
  grunt.initConfig({
    uglify: {
      build: {
        src: 'src/cato.js',
        dest: 'dest/cato.min.js'
      }
    },
    cssmin: {
      target: {
        files: {
          'dest/cato.min.css': 'src/cato.css'
        }
      }
    }
  })

  grunt.loadNpmTasks('grunt-contrib-uglify')
  grunt.loadNpmTasks('grunt-contrib-cssmin')

  grunt.registerTask('default', ['uglify', 'cssmin'])
}
