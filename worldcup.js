var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var bodyParser = require('body-parser');

//serve map directory
app.use('/map', express.static(__dirname + '/map'));

app.post('/receive', bodyParser.json(), function(req, res) {
    console.log("got request", req.body);

    // broadcast to all connected clients
    io.emit('new_msg', req.body);
});


server.listen(9998);

// connection event for each connected client
io.on('connection', function (socket) {
  console.log("User connected");
});
