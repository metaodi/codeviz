'use strict';

var Hapi = require('hapi');
var GitHubApi = require('github');

var Github = new GitHubApi({
    version: "3.0.0",
    timeout: 5000
});

// Create a server with a host and port
var server = Hapi.createServer('0.0.0.0', 8080);

server.route({
    method: 'GET',
    path: '/stats/{org}',
    handler: function(request, reply) {
        console.log(request.params)
        Github.orgs.getMembers({
            org: request.params.org,
            per_page: 100
        }, function(err, res) {
            console.log(res);
            reply("test3");
        });
    }
});

// Start the server
server.start(function() {
  console.log('Server started at ' + server.info.uri);
});
