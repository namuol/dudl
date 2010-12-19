var http        = require('http');
var connect     = require('connect');
var fs          = require('fs');
var io          = require('socket.io');
var sanitizer   = require('sanitizer');
var _           = require('underscore');

// Basic server setup: ///////////////////////////////////

var config;

eval(fs.readFileSync('config.js','utf8'));
eval(fs.readFileSync('shared.js','utf8'));

function readClientHTML() {
    return fs.readFileSync('client.html', 'utf8');
}

var clientHTML = readClientHTML();

fs.watchFile('client.html', function(current, previous) {
    try {
        clientHTML = readClientHTML();
    } catch(e) {
        console.log('Problem reading client.html! Keeping old file!');
    }
});

var baseServer = http.createServer(function(req, res) {
    res.writeHead(200,{'Content-Type':'text/html'});
    res.write(clientHTML);
    res.end();
});

var server = connect.createServer(
    connect.staticProvider(),
    baseServer
);

server.listen(config.port);
console.log("Listening on port " + config.port);

// END Basic server setup ////////////////////////////////

// Socket.IO setup ///////////////////////////////////////
var socket = io.listen(server);
var clients = [];
var log = [];

function broadcast(msg, client) {
    log.push(msg);
    if(log.length > config.max_log_length) {
        log = _.tail(log);
    }

    var data = encodeMsg(msg);

    _.without(clients,client).forEach(function(c,index,array) {
        c.send(data);
    });

    console.log('BCAST: ' + JSON.stringify(msg));
}

socket.on('connection', function(client) {
    client.send(encodeMsg({type:'hideCanvas'}));
    log.forEach(function(msg,index,array) {
        client.send(encodeMsg(msg));
    });
    client.send(encodeMsg({type:'showCanvas'}));

    clients.push(client);

    client.on('message', function(data) {
        var msg = decodeMsg(data);
        console.log('RECV: ' + client + ': ' + JSON.stringify(msg));
        switch(msg.type) {
        default:
            broadcast(msg, client);
            break;
        }

    });

    client.on('disconnect', function() {
        if(_.indexOf(clients, client) != -1) {
            clients = _.without(clients, client);
            /*
            broadcast({
                type: 'left',
                name: client.name
            });
            console.log(client.name + ' left');
            */
        }
    });
});
// END Socket.IO setup ///////////////////////////////////
