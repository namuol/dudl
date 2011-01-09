function DudlPad(outer_container, width, height, uchat, socket, debug) {
    // Create inner container:
    var container = document.createElement('div');
    $(container).addClass('dudlpad-container');
    $(outer_container).append(container);

    // Create the canvas element:
    var canvas = document.createElement('canvas');
    $(canvas).append("Looks like your browser doesn't support HTML5 CANVAS<br\>"+
                     "Try Chrome, Safari, Firefox or Opera.");
    canvas.width = width;
    canvas.height = height;

    var context = canvas.getContext('2d');
    context.lineWidth = 4.0;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    resizeCanvas();
    disableDrawing();
    hideCanvas();

    var msg_container = document.createElement('ul');
    $(msg_container).addClass('user-msg');
    $(container).append(msg_container);

    $(container).append(canvas);

    $(container).hide();
    
    var history = new DudlHistory(debug);
    
    ///////////////////////////////////////////////////////////////////////////
    // INPUT EVENTS

    var shiftPressed = false,
        ctrlPressed = false,
        mouseX = 0,
        mouseY = 0,
        mouseHend = false,
        drawing = false;

    // Utility func to grab the mouse position relative to the canvas
    //  based on a jQuery event.
    function mousePos(e) {
        var canvasPos = $(canvas).offset();
        var absX = e.pageX - canvasPos.left;
        var absY = e.pageY - canvasPos.top;

        return [absX * (canvas.width/$(canvas).innerWidth()),
                absY * (canvas.height/$(canvas).innerHeight())];
    };

    $(window).keydown(function(e) {
        if(e.keyCode == '16') { // SHIFT
            shiftPressed = true;
        } else if(e.keyCode == '17' ||
                  e.keyCode == '224') { // CTRL
            ctrlPressed = true;
        } else if(e.keyCode == '89') { // Y
            if(!history.punchedIn && ctrlPressed)
                fireEventAndSendMsg('redo',{});
        } else if(e.keyCode == '90') { // Z
            if(!history.punchedIn && ctrlPressed)
                fireEventAndSendMsg('undo',{});
        }
    });

    $(window).keyup(function(e) {
        if(e.keyCode == '16') { // SHIFT
            shiftPressed = false;
        } else if(e.keyCode == '17' ||
                  e.keyCode == '224') { // CTRL
            ctrlPressed = false;
        }
    });

    $(uchat.join_form).submit( function() {
        sendMsg('chatHandler', {
            type: 'joined',
            name: $(uchat.name).val()
        });
        $(uchat.status_msg).hide();
        $(uchat.join_form).hide();
        $(uchat.chat_panel).show();
        $(container).show();
        return false;
    });

    $(uchat.msg_form).submit( function() {
        var msg = $(uchat.msg_text).val();
        if(msg[0] == '/') {
            uchat.tryToDoCommand(msg);
        } else {
            sendMsg('chatHandler', {
                type: 'msg',
                msg: msg
            });
        }
        
        uchat.msgHistoryPos = uchat.msgHistory.push(msg);

        $(uchat.msg_text).val('');
        return false;
    });

    $(uchat.msg_text).keydown(function(e) {
        switch(e.keyCode) {
        case 38: // UP
            if(uchat.msgHistoryPos >= uchat.msgHistory.length) {
                currentMsg = $(uchat.msg_text).val();
            }
            uchat.msgHistoryPos = uchat.msgHistoryPos <= 0 ? 0 : uchat.msgHistoryPos - 1;
            $(uchat.msg_text).focus();
            $(uchat.msg_text).val(uchat.msgHistory[uchat.msgHistoryPos]);
            return false;
            break;
        case 40: // DOWN
            if(uchat.msgHistoryPos <= uchat.msgHistory.length) {
                uchat.msgHistoryPos = uchat.msgHistoryPos >= uchat.msgHistory.length
                    ? uchat.msgHistory.length
                    : uchat.msgHistoryPos + 1;
                $(uchat.msg_text).focus();
                $(uchat.msg_text).val(uchat.msgHistory[uchat.msgHistoryPos]);
            } else {
                $(uchat.msg_text).focus();
                $(uchat.msg_text).val(currentMsg);
            }
            return false;
            break;
        default:
            currentMsg = $(uchat.msg_text).val();
        } 
    });

    // INPUT EVENTS
    ///////////////////////////////////////////////////////////////////////////

    $(window).resize(function(e) {
        resizeCanvas();
    });

    function resizeCanvas() {
        $(canvas).hide();
        var ratio = canvas.width / canvas.height; 
        var cwidth = $(container).innerWidth(),
            cheight = $(container).innerHeight();
        var cratio = cwidth / cheight;
        var width, height;
        if(cratio > ratio) {
            height = cheight;
            width = height * ratio;
        } else {
            width = cwidth;
            height = width / ratio;
        }

        $(canvas).width(width);
        $(canvas).height(height);
        $(canvas).show();
    }

    var connectingMsg;
    function connect() {
        $(connectingMsg).remove();
        connectingMsg = userMsg("connecting...");
        tryConnect(0);
    };

    function tryConnect(attemptNumber) {
        attemptNumber = attemptNumber || 0;

        if(attemptNumber > 3) {
            $(connectingMsg).delay(1000).hide(100,function(){$(this).remove();});
            $(msgs_container).children().hide(100,function(){$(this).remove();});
            errorMsg("could not connect :(");
            return;
        }
        
        socket.connect();

        setTimeout(function() {
            if(!socket.connected) {
                tryConnect(attemptNumber + 1);
            }
        }, socket.options.connectTimeout + 25);
    };


    socket.on('connect', function() {
        $(uchat.status_msg).html('who are you?');
        $(uchat.status_msg).show();
        $(uchat.join_form).show();
        $(uchat.name).focus();
        $('input').attr('disabled',false);

        getErrorMsgs().hide(100,function(){$(this).remove();});
        $(connectingMsg).delay(1000).hide(100,function(){$(this).remove();});
        $(userMsg("connected!")).delay(1500).hide(100,function(){$(this).remove();});
    });

    socket.on('disconnect', function () {
        $(errorMsg("disconnected :(")).delay(2500).hide(100,function(){$(this).remove();});
        disableDrawing();
        $(connectingMsg).remove();
        connectingMsg = userMsg("reconnecting...");
        tryConnect(0);
    });

    connect();

    socket.on('message', function(data) {
        var msg = decodeMsg(data);
        //debug.err(JSON.stringify(msg));
        eval(msg.type + '(msg.data);');
        history.doCommand(msg);
    });

    function sendMsg(msgType, argData) {
        var msg = {
            type: msgType,
            data: argData
        };
        //debug.out(JSON.stringify(msg));
        socket.send(encodeMsg(msg));
    };

    function fireEventAndSendMsg(msgType, argData) {
        sendMsg(msgType, argData);
        eval(msgType + '(argData);');
        var msg = {
            type: msgType,
            data: argData
        };
        history.doCommand(msg);
    };

    function userMsg(msg, klass) {
        var msgElem = document.createElement('li');
        if(typeof(klass) !== 'undefined')
            $(msgElem).addClass(klass);
        $(msgElem).append(msg);
        $(msgElem).hide();
        $(msg_container).append(msgElem);
        $(msgElem).show(100);
        return msgElem;
    };
    this.userMsg = userMsg;

    function errorMsg(msg) {
        userMsg(msg,'error');
    };

    function getErrorMsgs() {
        return $(msg_container).children('.error');
    };

    ////////////////////////////////////////////////////////////
    function hideCanvas(data) {
        $(canvas).hide();
    };
    this.hideCanvas = hideCanvas;

    function showCanvas(data) {
        $(canvas).show();
    };
    this.showCanvas = showCanvas;

    function drawLines(data) {
        // ARGS //////////////
        var lines = data.lines;
        // ARGS //////////////
        var ctx = context;
        ctx.beginPath();
        for(var i=0; i<lines.length; ++i) {
            ctx.moveTo(lines[i].x1,lines[i].y1);
            ctx.lineTo(lines[i].x2,lines[i].y2);
        }
        ctx.closePath();
        ctx.stroke();
    };

    function buildHistory(data) {
        // ARGS /////////////////
        var newhist = data.history;
        history = new DudlHistory(
            debug,
            newhist.msgs,
            newhist.hpos,
            newhist.punchedIn
        );
    };

    function redraw(data) {
        if(history.canUndo()){
            undo();
            redo();
        }
    };

    function punchIn(data) {
    };

    function punchOut(data) {
    };
    
    function undo(data) {
        if(history.canUndo()) {
            context.clearRect(0,0,canvas.width,canvas.height);
            history.doUndo(function(msg) {
                var evalString = msg.type + '(msg.data);';
                eval(evalString);
            });
        }
    };

    function redo(data) {
        if(history.canRedo()) {
            history.doRedo(function(msg) {
                var evalString = msg.type + '(msg.data);';
                eval(evalString);
            });
        }
    };

    function setDrawStyle(data) {
        // ARGS //////////////
        var lineWidth = data.lineWidth,
            color = data.color;
        // ARGS //////////////

        canvas.lineWidth = lineWidth;
        canvas.strokeStyle = color;
        canvas.fillStyle = color;
    };

    function drawLine(data) {
        // ARGS //////////
        var x1 = data.x1,
            x2 = data.x2,
            y1 = data.y1,
            y2 = data.y2;
        // ARGS //////////

        var ctx = context;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.closePath();
        ctx.stroke();
    };

    function enableDrawing() {
        $(canvas).mousedown(function(e) {
        
            fireEventAndSendMsg(
                'punchIn',
                {type:'drawLines', data: {lines: []}}
            );

            var pos = mousePos(e);
            mouseX = pos[0];
            mouseY = pos[1];

            mouseHeld = true;
            drawing = true;

            $(canvas).toggleClass('hide-cursor',true);
        });

        $(canvas).mousemove(function(e) {

            if(drawing) {
                var pos = mousePos(e);

                var coords = {
                    x1: mouseX,
                    y1: mouseY,
                    x2: pos[0],
                    y2: pos[1]
                };

                fireEventAndSendMsg('drawLine', coords);

                mouseX = pos[0];
                mouseY = pos[1];
            }
        });

        $(canvas).mouseup(function(e) {
            $(canvas).toggleClass('hide-cursor',false);
            mouseHeld = false;
            drawing = false;
            fireEventAndSendMsg('punchOut',{});
        });

        $(canvas).mouseleave(function(e) {
            drawing = false;
        });

        $(canvas).mouseenter(function(e) {
            if(mouseHeld) {
                drawing = true;
            }
        });
    };

    function disableDrawing() {
        $(canvas).unbind();
    };

    function chatHandler(argData) {
        // ARGS ////////////////
        var type = argData.type;
        // ARGS ?///////////////
        //debug.out(JSON.stringify(argData));
        var jtpl = jQuery.createTemplate($('#' + type + '-jtpl').val());
        var txt = jQuery.processTemplateToText(jtpl, argData);
        $(uchat.msgs).append(txt);
        
        $(uchat.msgs)[0].scrollTop = $(uchat.msgs)[0].scrollHeight;
        $(uchat.msg_text).focus();
    };

    return true;
};

function DudlDebug() {
    var debugPanel = document.createElement('div');
    $(debugPanel).addClass('debugPanel');
    $(debugPanel).hide();
    $('body').append(debugPanel);

    function out(str) {
        str = (str + '\n').replace('\n','<br>');
        $(debugPanel).append(str);
        debugPanel.scrollTop = debugPanel.scrollHeight;
    };
    this.out = out;

    function err(str) {
        out('<span class="err">'+str+'</span>');
    };
    this.err = err;

    function elem() {
        return debugPanel;
    };
    this.elem = elem;

    return true;
};
