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

function broadcast(msg, client) {
    log.push(msg);
    if(log.length > config.max_log_length) {
        log = _.tail(log);
    }

    var data = encodeMsg(msg);

    _.without(clients,client).forEach(function(c,index,array) {
        if(typeof(c) == 'undefined') break;
        c.send(data);
    });

    //console.log('BCAST: ' + JSON.stringify(msg));
}

socket.on('connection', function(client) {
    client.send(encodeMsg({type:'hideCanvas'}));
    history.cleanMsgs();
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
    console.log(JSON.stringify({
                msgs: history.msgs,
                hpos: history.hpos(),
                punchedIn: history.punchedIn
    }));
    client.send(encodeMsg({type:'redraw'}));
    client.send(encodeMsg({type:'showCanvas'}));

    clients.push(client);

    client.on('message', function(data) {
        var msg = decodeMsg(data);
        history.doCommand(msg);
        //console.log('RECV: ' + client + ': ' + JSON.stringify(msg));
        switch(msg.type) {
        case 'undo':
            history.doUndo();
            break;
        case 'redo':
            history.doRedo();
            break;
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
