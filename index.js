'use strict';

var Hapi = require('hapi');
var Async = require('async');
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

var orgMap = {};

// serve JSON for highchart
server.route({
    method: 'GET',
    path: '/stats/{org}',
    handler: function(request, reply) {
        if (orgMap[request.params.org] && !request.url.query.hasOwnProperty('force')) {
            reply(orgMap[request.params.org]);
            return;
        }
        Async.waterfall([
            function(callback) {
                console.log("getting member");
                Github.orgs.getMembers({
                    org: request.params.org,
                    per_page: 100
                }, function (err, res) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    callback(null, res);
                });
            },
            function(res, callback) {
                console.log("got members, getting details");
                var userData = [];
                var callbackCount = res.length;
                for (var i in res) {
                    var user = res[i]
                    if (user.login) {
                        console.log("user", user);
                        Github.user.getFrom({user: user.login}, function (e, ghuser) {
                            console.log("got details from " + ghuser.login);
                            if (e) {
                                console.log(e);
                                userData.push([user.login, 0]);
                                return;
                            }
                            userData.push([ghuser.login, ghuser.public_repos]);

                            //check of this is the last call
                            if(userData.length == res.length) {
                                callback(null, userData);
                            }
                        });
                    }
                }
            },
            function(userData, callback) {
                console.log("got all user details");
                callback(null, {
                    title: {
                        text: 'Repositories per User',
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
                        name: 'Amount of repositories',
                        data: userData
                    }]
                });
            },
            function(highchartsJson, callback) {
                console.log("reply");
                orgMap[request.params.org] = highchartsJson;
                reply(highchartsJson);
            }
        ]);
    }
});

// serve the static chart file
server.route({
    method: 'GET',
    path: '/chart/{org}',
    handler: {
        file: 'chart.html'
    }
});

// Start the server
server.start(function() {
  console.log('Server started at ' + server.info.uri);
});
