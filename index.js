'use strict';

var Hapi = require('hapi');
var _ = require('underscore');
var Promise = require('promise');
var Fs = require('fs');
var charts = require('./lib/charts');

// Create a server with a host and port
var port = process.env.PORT || 8080;
var server = Hapi.createServer('0.0.0.0', +port);

// serve JSON for highchart
var cache = {};

// serve JSON for highchart
server.route({
    method: 'GET',
    path: '/stats/{org}/repo',
    handler: function(request, reply) {
        if (cache['stats-repositories'][request.params.org] && !request.url.query.hasOwnProperty('force')) {
            reply(cache['stats-repositories'][request.params.org]);
            return;
        }
        charts.orgUserRepo(request.params.org, 
            function(res) {
                cache['stats-repositories'][request.params.org] = res;
                reply(res);
            }, 
            function() {
                reply(error);
            }
        );
    }
});

server.route({
    method: 'GET',
    path: '/stats/{org}/contrib',
    handler: function(request, reply) {
        if (cache['stats-contrib'][request.params.org] && !request.url.query.hasOwnProperty('force')) {
            reply(cache['stats-contrib'][request.params.org]);
            return;
        }
        charts.orgUserContrib(request.params.org, 
            function(res) {
                cache['stats-contrib'][request.params.org] = res;
                reply(res);
            }, 
            function() {
                reply(error);
            }
        );
    }
});

server.route({
    method: 'GET',
    path: '/stats/{org}/languages',
    handler: function(request, reply) {
        if (cache['stats-languages'][request.params.org] && !request.url.query.hasOwnProperty('force')) {
            reply(cache['stats-languages'][request.params.org]);
            return;
        }
        charts.orgUserLanguages(request.params.org, 
            function(res) {
                cache['stats-languages'][request.params.org] = res;
                reply(res);
            }, 
            function() {
                reply(error);
            }
        );
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
server.route({
    method: 'GET',
    path: '/orgs/{org}/languages',
    handler: {
        file: 'chart.html'
    }
});

// Start the server
server.start(function() {
  console.log('Server started at ' + server.info.uri);
});
