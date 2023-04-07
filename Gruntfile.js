module.exports = function(grunt) {

    const fs = require('fs')
    const YAML = require('yaml')

    var user = grunt.option('user') || 'max';

    grunt.loadNpmTasks('grunt-screeps');
    // https://docs.screeps.com/contributed/advanced_grunt.html#Private-Server

    const users = YAML.parse(fs.readFileSync('./users.yml', 'utf8'))
    const server = fs.existsSync('./server.yml') ? YAML.parse(fs.readFileSync('./server.yml', 'utf8')) : undefined;

    const email = users[user].email;
    const password = users[user].password;
    const token = users[user].token;

    grunt.initConfig({
        screeps: {
            options: {
                ...(server && { server: server }),
                email: email,
                ...(token && { token: token }),
                ...(password && { password: password }),
                branch: 'nbd-night',
                ...(server && { ptr: false }),
            },
            dist: {
                src: ['src/*.js']
            }
        }
    });

}
