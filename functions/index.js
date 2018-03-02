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

var eastPoint;
var intersecLoc;
var usrLoc;
var thetaEastroad; // The theta offset between real east and the direction of the eastward road.

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
    io.emit('stateUpdate', {state:state, next:tnext});
}

function localCoords(point){
    return {lon: point.lon-intersecLoc.lon, lat: point.lat-intersecLoc.lat}
}

function getRoad(eastPoint, intersecLoc, usrLoc) {
    usrLocl = localCoords(usrLoc);
    // lat is y and lon is x
    thetaUsr = Math.degrees(Math.atan2(usrLocl.lat, usrLocl.lon));
    thetaUsr = ((thetaUsr % 360) + 360) % 360;

    relUsrTheta = thetaUsr - thetaEastroad;
    relUsrTheta = ((relUsrTheta % 360) + 360) % 360;
    
    var usrRoad;
    console.log('usrTheta:', relUsrTheta)
    if (relUsrTheta >= (45) && relUsrTheta < (45 + 90)) {
        usrRoad = 'north';
    } else if (relUsrTheta >= (135) && relUsrTheta < (135 + 90)) {
        usrRoad = 'west';
    } else if (relUsrTheta >= (135 + 90) && relUsrTheta < (135 + 180)) {
        usrRoad = 'south';
    } else if (relUsrTheta >= (270 + 45) && relUsrTheta < (360)) {
        usrRoad = 'east'; 
    } else if (relUsrTheta >= (0) && (relUsrTheta < (45))) {
        usrRoad = 'east';
    }
    console.log('usrRoad:', usrRoad)
    return usrRoad
}

app.use(express.static(path.join(__dirname, '..', 'public')))
app.use('/private', express.static(path.join(__dirname, '..', 'private')))

console.log('Server running at http://localhost:8080/');
http.listen(8080, '127.0.0.1', function() {
    console.log('[DEBUG]');
});

io.on('connection', function(socket) {
    console.log('iz hooked up');

    socket.on('setIntersecLoc', function(position) {
        console.log(position.lat, position.lon);
        intersecLoc = position;
        io.emit('updateLoc', position);
    });

    socket.on('setEast', function(position) {
        console.log(position.lat, position.lon);
        eastPoint = position;
        eastPointl = localCoords(eastPoint)
        // TODO send update east error message if eastPointl is very close to zero length
        thetaEastroad = Math.degrees(Math.atan2(eastPointl.lat, eastPointl.lon));
        thetaEastroad = (thetaEastroad + 360) % 360;
        socket.emit('updateEast', `east set angle is: ${thetaEastroad}`);
    });

/*    socket.on('updateUsrLoc', function(position) {
        console.log(position.latitude, position.longitude);
        usrLoc = position;
    });
*/

    socket.on('getRoad', function(position) {
       usrLoc = position;
       socket.emit('roadUpdate', getRoad(eastPoint, intersecLoc, usrLoc)); 
    });

    socket.on('getIntersecLoc', function(position) {
       socket.emit('updateIntersecLoc', intersecLoc); 
    });

    socket.on('disconnect', function() {
        console.log('dis user\'s gon\' now');
    });
});

setInterval(update, 100);

Math.radians = function(degrees) {
    return degrees * Math.PI / 180;
};

Math.degrees = function(radians) {
  return radians * 180 / Math.PI;
};
