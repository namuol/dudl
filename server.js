/*jslint
    white: true,
    onevar: true,
    undef: true,
    newcap: true,
    regexp: true,
    plusplus: true,
    bitwise: true,
    maxerr: 50,
    indent: 4 */
/*global
    setTimeout,
    console,
    __dirname,
    require*/

var connect = require('connect'),
    config  = require('./config'),
    http    = require('http'),
    mio     = require('./support/multio/lib/multio'),
    uchat   = require('./support/uchat/lib/uchat'),
    io      = require('socket.io'),
    fs      = require('fs'),
    _       = require('underscore');

fs.readFile(__dirname + '/views/index.html', function (err, data) {
    var clientHTML = data,
    baseServer,
    server,
    socket,
    mocket;

    baseServer = http.createServer(function (req, res) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(clientHTML);
        res.end();
    });

    server = connect.createServer(
        connect.compiler({src: __dirname + '/public', enable: ['less']}),
        connect.staticProvider(__dirname + '/public'),
        baseServer
    );

    server.listen(config.port);
    console.log('Server listening on port ' + config.port + '.');
    socket = io.listen(server);
    mocket = mio.listen(socket);

    uchat.listen(mocket, {
        callbacks: {
            after: {
                'uchat-enter': function (client, roomName) {
                    function bcastAndLogAllButMe() {
                        var i,
                            room = client.room;

                        for (i = 0; i < room.clients.length; i += 1) {
                            if (typeof room.clients[i] !== 'undefined' && room.clients[i] !== client) {
                                room.clients[i].send.apply(room.clients[i], arguments);
                            }
                        }
                        room.log.push(arguments);
                        if (room.log.length > config.max_log_length) {
                            room.log = _.tail(room.log);
                        }
                    }
                    
                    client.broadcast = bcastAndLogAllButMe;

                    client.on({
                        'dudl-drawLines': function (lines) {
                            client.broadcast('dudl-drawLines', lines);
                        },
                        'dudl-punchIn': function () {
                            client.broadcast('dudl-punchIn');
                        },
                        'dudl-punchOut': function () {
                            client.broadcast('dudl-punchOut');
                        },
                        'dudl-undo': function () {
                            client.broadcast('dudl-undo');
                        },
                        'dudl-redo': function () {
                            client.broadcast('dudl-redo');
                        }
                    });

                }
            }
        }
    });
});
