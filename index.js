'use strict';

var Hapi = require('hapi');
var charts = require('./lib/charts');

// Create a server with a host and port
var port = process.env.PORT || 8080;
var server = Hapi.createServer('0.0.0.0', +port);

// serve JSON for highchart
var orgMap = {};

// serve JSON for highchart
server.route({
    method: 'GET',
    path: '/stats/{org}/repo',
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

var contribMap = {};
server.route({
    method: 'GET',
    path: '/stats/{org}/contrib',
    handler: function(request, reply) {
        if (contribMap[request.params.org] && !request.url.query.hasOwnProperty('force')) {
            reply(contribMap[request.params.org]);
            return;
        }
        charts.orgUserContrib(request.params.org, function(res) {
            contribMap[request.params.org] = res;
            reply(res);
        });
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
    path: '/orgs/{org}/repo',
    handler: {
        file: 'chart.html'
    }
});
server.route({
    method: 'GET',
    path: '/orgs/{org}/contrib',
    handler: {
        file: 'chart.html'
    }
});

// Start the server
server.start(function() {
  console.log('Server started at ' + server.info.uri);
});
