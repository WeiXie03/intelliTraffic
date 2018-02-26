#!/usr/bin/env nodejs

var express = require('express');
var app = express();

var http = require('http').Server(app);
var path = require('path');

var io = require('socket.io')(http);

var tlast = -1;
var tnext = -1;
var numstates = 3;
var state = 0; //0 = green, 1 = yellow, 2 = red
var twait = [20000,3000,20000];

function update() {
    var curr = Date.now();
    if(tlast == -1) {
        tlast = curr;
        tnext = twait[state] + tlast;
    }

    if (curr >= tnext) {
        state = (state + 1) % numstates;
        tlast = tnext;
        tnext = twait[state] + tlast;
        console.log('State is ', state);
    }
    io.emit('check', {state:state, next:tnext});
}

app.use(express.static(path.join(__dirname, '..', 'public')))
app.use('/private', express.static(path.join(__dirname, '..', 'private')))

console.log('Server running at http://localhost:8080/');
http.listen(8080, '127.0.0.1', function() {
    console.log('[DEBUG]');
});

io.on('connection', function(socket) {
    console.log('iz hooked up');
    socket.on('setServerLocation', function(position) {
        console.log(position);
        console.log(position.latitude, position.longitude);
    });
    socket.on('disconnect', function() {
        console.log('dis user\'s gon\' now');
    });
});

setInterval(update, 100);
