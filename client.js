function DudlPad(container, width, height, socket) {
    // Create the canvas element:
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    var debugPanel = document.createElement('div');
    $(debugPanel).addClass('debugPanel');
    $('body').append(debugPanel);

    var context = canvas.getContext('2d');
    context.lineWidth = 4.0;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    $(container).append(canvas);

    var mouseX = 0,
        mouseY = 0,
        mouseHend = false,
        drawing = false,
        punchedIn = false,
        history = [],
        hpos = -1; // Current position within history

    $(canvas).mousedown(function(e) {
        mouseX = e.pageX - canvas.offsetLeft;
        mouseY = e.pageY - canvas.offsetTop;
    
        fireEventAndSendMsg(
            'punchIn',
            {type:'drawLines', lines: []}
        );

        mouseHeld = true;
        drawing = true;
    });

    $(canvas).mousemove(function(e) {

        if(drawing) {
            var x = e.pageX - canvas.offsetLeft;
            var y = e.pageY - canvas.offsetTop;

            var coords = {
                x1: mouseX,
                y1: mouseY,
                x2: x,
                y2: y
            };


            fireEventAndSendMsg('drawLine', coords);

            mouseX = x;
            mouseY = y;
        }
    });

    $(canvas).mouseup(function(e) {
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

    var shiftPressed = false,
        ctrlPressed = false;

    $(window).keydown(function(e) {
        if(e.keyCode == '16') { // SHIFT
            shiftPressed = true;
        } else if(e.keyCode == '17') { // CTRL
            ctrlPressed = true;
        } else if(e.keyCode == '89') { // Y
            if(ctrlPressed)
                fireEventAndSendMsg('redo',{});
        } else if(e.keyCode == '90') { // Z
            if(ctrlPressed)
                fireEventAndSendMsg('undo',{});
        }
    });

    $(window).keyup(function(e) {
        if(e.keyCode == '16') { // SHIFT
            shiftPressed = false;
        } else if(e.keyCode == '17') { // CTRL
            ctrlPressed = false;
        }
    });


    socket.on('message', function(data) {
        var msg = decodeMsg(data);
        //debug(msg.type + '(' + JSON.stringify(msg) + ')');
        eval(msg.type + '(msg.data);');
    });

    function fireEventAndSendMsg(msgType, argData) {
        var msg = {
            type: msgType,
            data: argData
        };
        socket.send(encodeMsg(msg));
        eval(msgType + '(argData);');
    };

    this.fire = fireEventAndSendMsg;

    ////////////////////////////////////////////////////////////
    function hideCanvas(args) {
        $(canvas).hide();
    };

    function showCanvas(args) {
        $(canvas).show();
    };

    function drawLines(args) {
        // ARGS //////////////
        var lines = args.lines;
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
    

    function punchIn(args) {
        // ARGS ////////////
        var data = args;
        // ARGS ////////////
        punchedIn = true;
        ++hpos;
        history[hpos] = data;
        history[hpos+1] = undefined;
    };

    function punchOut(args) {
        punchedIn = false;
    };

    function setDrawStyle(args) {
        // ARGS //////////////
        var lineWidth = args.lineWidth,
            color = args.color
        // ARGS //////////////

        canvas.lineWidth = lineWidth;
        canvas.strokeStyle = color;
        canvas.fillStyle = color;
    };

    function drawLine(args) {
        // ARGS //////////
        var x1 = args.x1,
            x2 = args.x2,
            y1 = args.y1,
            y2 = args.y2;
        // ARGS //////////
        if(punchedIn) {
            history[hpos].lines.push({
                x1:x1, x2:x2,
                y1:y1, y2:y2
            });
        }

        var ctx = context;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.closePath();
        ctx.stroke();
    };

    function undo(args) {
        if(hpos >= 0) {
            context.clearRect(0,0,canvas.width,canvas.height);
            for(var i=0; i < hpos && history[i] != undefined; ++i) {
                eval(history[i].type + '(history[i]);');
            }
            --hpos;
        }
    };

    function redo(args) {
        if(history[hpos+1] != undefined) {
            eval(history[hpos+1].type + '(history[hpos+1]);');
            ++hpos;
        }
    };

    function debug(str) {
        str = (str + '\n').replace('\n','<br>');
        $(debugPanel).append(str);
        debugPanel.scrollTop = debugPanel.scrollHeight;
    };

    function error(str) {
        debug('<span class="err">'+str+'</span>');
    };

    return true;
};


