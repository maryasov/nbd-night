module.exports = function(grunt) {

    const fs = require('fs')
    const YAML = require('yaml')

    var user = grunt.option('user') || 'max';

    grunt.loadNpmTasks('grunt-screeps');
    // https://docs.screeps.com/contributed/advanced_grunt.html#Private-Server

    const file = fs.readFileSync('./users.yml', 'utf8')
    const users = YAML.parse(file)

    const email = users[user].email;
    const token = users[user].token;

    grunt.initConfig({
        screeps: {
            options: {
                email: email,
                token: token,
                branch: 'nbd-night',
            },
            dist: {
                src: ['src/*.js']
            }
        }
    });

}
