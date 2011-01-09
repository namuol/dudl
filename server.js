var http        = require('http');
var connect     = require('connect');
var fs          = require('fs');
var io          = require('socket.io');
var sanitizer   = require('sanitizer');
var _           = require('underscore');
var less        = require('less');

// Basic server setup: ///////////////////////////////////

var config;

eval(fs.readFileSync('config.js','utf8'));
eval(fs.readFileSync('pub/shared.js','utf8'));

function readClientHTML() {
    return fs.readFileSync('pub/client.html', 'utf8');
}

var clientHTML = readClientHTML();
fs.watchFile('pub/client.html', function(current, previous) {
    try {
        clientHTML = readClientHTML();
    } catch(e) {
        console.log('Problem reading client.html! Keeping old file!');
    }
});

function renderClientCSS() {
    var renderedCss;

    less.render(fs.readFileSync('pub/client.less','utf8'), function(err, css) {
        if(err) {
            throw err;
        } else {
            renderedCss = css;
        }
    });

    fs.writeFileSync('pub/client.css', renderedCss, 'utf8');
}
try {
renderClientCSS();
} catch(e) { console.log(e);}

fs.watchFile('pub/client.less', function(current, previous) {
    try {
        renderClientCSS();
    } catch(e) {
        console.log('Problem reading/parsing client.less! Keeping old file!');
        console.log(e);
    }
});

var baseServer = http.createServer(function(req, res) {
    res.writeHead(200,{'Content-Type':'text/html'});
    res.write(clientHTML);
    res.end();
});

var server = connect.createServer(
    //connect.logger(),
    connect.staticProvider(__dirname + '/pub'),
    baseServer
);

server.listen(config.port);
console.log("Listening on port " + config.port);

// END Basic server setup ////////////////////////////////

// Socket.IO setup ///////////////////////////////////////
var socket = io.listen(server);
var clients = [];
var log = [];
var history = new DudlHistory(new MyDebug());

function MyDebug() {
    this.out = function(msg){console.log(msg);}
    this.err = function(msg){console.log(msg);}
    return true;
};

function chatLog(msg) {
    log.push(msg);
    if(log.length > config.max_log_length) {
        log = _.tail(log);
    }
};

function broadcast(msg, client) {
    var data = encodeMsg(msg);

    _.without(clients,client).forEach(function(c,index,array) {
        if(typeof(c) == 'undefined') break;
        c.send(data);
    });

    //console.log('BCAST: ' + JSON.stringify(msg));
};

socket.on('connection', function(client) {
    client.send(encodeMsg({type:'hideCanvas'}));
    history.cleanMsgs();
    
    // Send chat log:
    log.forEach(function(msg,index,array) {
        client.send(encodeMsg(msg));
    });

    // Send current drawing history:
    client.send(encodeMsg({
        type: 'buildHistory',
        data: {
            history: {
                msgs: history.msgs,
                hpos: history.hpos(),
                punchedIn: history.punchedIn
            }
        }
    }));

    client.send(encodeMsg({type:'redraw'}));
    client.send(encodeMsg({type:'showCanvas'}));
    client.send(encodeMsg({type:'enableDrawing'}));


    client.on('message', function(data) {
        var msg = decodeMsg(data);
        history.doCommand(msg);

        // Default: don't rebroadcast the message to the client
        var clientToIgnore = client; 

        switch(msg.type) {
        case 'chatHandler':
            clientToIgnore = null; // Broadcast msg back to all clients.

            var chatData = msg.data;
            chatData.time = (new Date()).getTime();

            switch(chatData.type) {
            case 'joined':
                // Ignore clients that have already joined:
                if(_.indexOf(clients, client) != -1)
                    break;

                clients.push(client);
                client.name = chatData.name;
                console.log(client.name + ' joined');
                break;
            case 'msg':
                if(clients.indexOf(client) == -1) return;
                chatData.name = client.name;
                console.log(client.name + ': ' + chatData.msg);
                break;
            }

            chatLog(msg);
            break;
        case 'undo':
            history.doUndo();
            break;
        case 'redo':
            history.doRedo();
            break;
        }
        broadcast(msg, clientToIgnore);
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
