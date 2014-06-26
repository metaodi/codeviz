var GitHubApi = require('github');
var Fs = require('fs');
var Yaml = require('js-yaml');

var github = null;
var getGitHub = function() {
    if (github) {
        return github;
    }
    github = new GitHubApi({
        version: "3.0.0",
        timeout: 5000
    });
    //load config and authenticate if there is a config
    if (Fs.existsSync('config.yml')) {
        var app = Yaml.safeLoad(Fs.readFileSync('config.yml', 'utf8'));
        github.authenticate({
            type: "basic",
            username: app.github.user,
            password: app.github.password
        });
    } else if (process.env.GITHUB_USER) {
        github.authenticate({
            type: "basic",
            username: process.env.GITHUB_USER,
            password: process.env.GITHUB_PASSWORD
        });
    }
    return github;
}

exports.getGitHub = getGitHub;
