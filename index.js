'use strict';

var Hapi = require('hapi');
var _ = require('underscore');
var Promise = require('promise');
var Fs = require('fs');
var Yaml = require('js-yaml');
var GitHubApi = require('github');

var Github = new GitHubApi({
    version: "3.0.0",
    timeout: 5000
});

//load config and authenticate if there is a config
if (Fs.existsSync('config.yml')) {
    var app = Yaml.safeLoad(Fs.readFileSync('config.yml', 'utf8'));
    Github.authenticate({
        type: "basic",
        username: app.github.user,
        password: app.github.password
    });
}

// Create a server with a host and port
var port = process.env.PORT || 8080;
var server = Hapi.createServer('0.0.0.0', +port);

var orgMap = {'stats-repositories': {}, 'stats-languages': {}};

function callGithub(call, params) {
    return new Promise(function (fulfill, reject) {
        call(params, function (err, res) {
            if (err) reject(err);
            else {
                fulfill(res);
            }
        });
    });
}

var getPieChart = function(title, name, data) {
    return {
        title: {
            text: title,
            x: -20 //center
        },
        subtitle: {
            text: 'Source: GitHub.com',
            x: -20
        },
        chart: {
            plotBackgroundColor: null,
            plotBorderWidth: 1,//null,
            plotShadow: false
        },
        tooltip: {
            pointFormat: '{series.name}: <b>{point.y}</b>'
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: true,
                    format: '<b>{point.name}</b>: {point.percentage:.1f} %',
                    style: {
                        color: 'black'
                    }
                }
            }
        },
        series: [{
            type: 'pie',
            name: name,
            data: data
        }]
    }
}

// serve JSON for highchart
server.route({
    method: 'GET',
    path: '/stats-repositories/{org}',
    handler: function(request, reply) {
        if (orgMap['stats-repositories'][request.params.org] && !request.url.query.hasOwnProperty('force')) {
            reply(orgMap['stats-repositories'][request.params.org]);
        }
        else {
            callGithub(Github.orgs.getMembers, {
                org: request.params.org,
                per_page: 100
            }).then(function(members) {
                return Promise.all(_.map(members, function(member) {
                    return callGithub(Github.user.getFrom, {
                        user: member.login
                    });
                }));
            }).then(function(users) {
                var json = getPieChart("Repositories", "Amount of repositories", 
                    _.map(users, function(ghuser) {return [ghuser.login, ghuser.public_repos]})
                );
                orgMap['stats-repositories'][request.params.org] = json;
                reply(json);
            }).catch(function(error) {
                console.log(error);
                reply(error);
            });
        }

    }
});

server.route({
    method: 'GET',
    path: '/stats-languages/{org}',
    handler: function(request, reply) {
        if (orgMap['stats-languages'][request.params.org] && !request.url.query.hasOwnProperty('force')) {
            reply(orgMap['stats-languages'][request.params.org]);
        }
        else {
            callGithub(Github.orgs.getMembers, {
                org: request.params.org,
                per_page: 100
            }).then(function(members) {
                return Promise.all(_.map(members, function(member) {
                    return callGithub(Github.repos.getFromUser, {
                        user: member.login
                    }).then(function(repositories) {
                        return Promise.all(_.map(repositories, function(repository) {
                            return callGithub(Github.repos.getLanguages, {
                                user: member.login,
                                repo: repository.name
                            });
                        }));
                    });
                }));
            }).then(function(languages) {
                languages = _.reduce(_.flatten(languages), function(mem, language) {
                    _.each(_.omit(language, 'meta'), function(value, key) {
                        if (mem[key] == undefined) mem[key] = 0;
                        mem[key] = mem[key] + value;
                    })
                    return mem;
                }, {})
                
                var json = getPieChart("Languages used by organisation", "Amount of bytes written",
                    _.map(languages, function(value, key) {return [key, value]})    
                );
                orgMap['stats-languages'][request.params.org] = json;
                reply(json);
            }).catch(function(error) {
                console.log(error);
                reply(error);
            });
        }

    }
});

// serve the static chart file
server.route({
    method: 'GET',
    path: '/chart/{stats}/{org}',
    handler: {
        file: 'chart.html'
    }
});

// Start the server
server.start(function() {
  console.log('Server started at ' + server.info.uri);
});