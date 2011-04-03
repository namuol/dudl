/*jslint
    white: true,
    onevar: true,
    undef: true,
    newcap: true,
    nomen: true,
    regexp: true,
    plusplus: true,
    bitwise: true,
    maxerr: 50,
    indent: 4 */
/*global
    MULTIO
    HIST
    module
    document
    window
    $
    jQuery
    setTimeout*/

var DUDL = {};

DUDL = function (outer_container, width, height, uchat, socket, debug) {
    var ui,
        mocket,
        hist,
        shiftPressed = false,
        ctrlPressed = false;
    
    hist = HIST.track();

    ////////////////////////////////////////////////////////////
    // UTILITY FUNCTIONS

    function disableDrawing(ui_in) {
        $(window).unbind();
        $(ui_in.canvas).unbind();
    }

    function resizeCanvas(ui_in) {
        $(ui_in.canvas).hide();

        var ratio = ui_in.canvas.width / ui_in.canvas.height, 
            cwidth = $(ui_in.container).innerWidth(),
            cheight = $(ui_in.container).innerHeight(),
            cratio = cwidth / cheight,
            width, height;

        if (cratio > ratio) {
            height = cheight;
            width = height * ratio;
        } else {
            width = cwidth;
            height = width / ratio;
        }

        $(ui_in.canvas).width(width);
        $(ui_in.canvas).height(height);
        $(ui_in.canvas).show();
    }

    function mousePos(e, canvas) {
        var canvasPos = $(canvas).offset(),
            absX = e.pageX - canvasPos.left,
            absY = e.pageY - canvasPos.top;

        return [absX * (canvas.width / $(canvas).innerWidth()),
                absY * (canvas.height / $(canvas).innerHeight())];
    }

    // UTILITY FUNCTIONS
    ////////////////////////////////////////////////////////////

    ui = (function () {
        ////////////////////////////////////////////////////////////
        // REMOTE-ABLE EVENT FUNCTIONS

        function hideCanvas() {
            $(ui.canvas).hide();
        }
        this.hideCanvas = hideCanvas;

        function showCanvas() {
            $(ui.canvas).show();
        }
        this.showCanvas = showCanvas;

        this.drawLines = hist.wrap(function drawLines(coords) {
            var ctx = ui.context,
                i;
            ctx.beginPath();
            for (i = 0; i < coords.length; i += 4) {
                ctx.moveTo(coords[i], coords[i + 1]);
                ctx.lineTo(coords[i + 2], coords[i + 3]);
            }
            ctx.closePath();
            ctx.stroke();
        });

        this.undo = function undo() {
            if (true || hist.canUndo()) {
                ui.context.clearRect(0, 0, ui.canvas.width, ui.canvas.height);
                hist.undo();
            }
        };

        this.redo = function redo() {
            hist.redo();
        };

        // REMOTE-ABLE EVENT FUNCTIONS
        ////////////////////////////////////////////////////////////

        // Create inner container:
        var container = document.createElement('div'),
            canvas = document.createElement('canvas'),
            context = canvas.getContext('2d'),
            msg_container = document.createElement('ul'),
            mouseX, mouseY,
            mouseHeld = false,
            drawing = false;

        this.container = container;
        this.canvas = canvas;
        this.context = context;
        this.msg_container = msg_container;

        $(container).addClass('dudlpad-container');
        $(outer_container).append(container);

        // Create the canvas element:
        $(canvas).append("Looks like your browser doesn't support HTML5 CANVAS<br>" +
                         "Try Chrome, Safari, Firefox or Opera.");
        canvas.width = width;
        canvas.height = height;

        context.lineWidth = 4.0;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        resizeCanvas(this);
        disableDrawing(this);
        $(msg_container).addClass('user-msg');
        $(container).append(msg_container);

        $(container).append(canvas);

        $(canvas).mousedown(function (e) {
            var pos = mousePos(e, canvas);
            mouseX = pos[0];
            mouseY = pos[1];

            mocket.fire('dudl-punchIn');
            mocket.fire('dudl-drawLines', [mouseX, mouseY, mouseX + 0.1, mouseY]);

            mouseHeld = true;
            drawing = true;

            $(canvas).toggleClass('hide-cursor', true);
        });

        $(canvas).mousemove(function (e) {

            if (drawing) {
                var pos = mousePos(e, canvas),
                    coords = {
                        x1: mouseX,
                        y1: mouseY,
                        x2: pos[0],
                        y2: pos[1]
                    };

                mocket.fire('dudl-drawLines', [mouseX, mouseY, pos[0], pos[1]]);

                mouseX = pos[0];
                mouseY = pos[1];
            }
        });

        $(canvas).mouseup(function (e) {
            $(canvas).toggleClass('hide-cursor', false);
            mouseHeld = false;
            drawing = false;
            mocket.fire('dudl-punchOut');
            /*fireEventAndSendMsg('punchOut', {});*/
        });

        $(canvas).mouseleave(function (e) {
            drawing = false;
        });

        $(canvas).mouseenter(function (e) {
            if (mouseHeld) {
                drawing = true;
            }
        });


        return this;
    }());


    ////////////////////////////////////////////////////////////
    // CLIENT INPUT EVENTS

    $(window).resize(function (e) {
        resizeCanvas(ui);
    });

    $(window).keydown(function (e) {
        if (e.keyCode === '16') { // SHIFT
            shiftPressed = true;
        } else if (e.keyCode == '17' ||
                  e.keyCode == '224') { // CTRL
            ctrlPressed = true;
        } else if (e.keyCode == '89') { // Y
            if (!hist.isPunchedIn() && ctrlPressed) {
                mocket.fire('dudl-redo');
            }
        } else if (e.keyCode == '90') { // Z
            if (!hist.isPunchedIn() && ctrlPressed) {
                mocket.fire('dudl-undo');
            }
        }
    });

    $(window).keyup(function (e) {
        if (e.keyCode == '16') { // SHIFT
            shiftPressed = false;
        } else if (e.keyCode == '17' ||
                   e.keyCode == '224') { // CTRL
            ctrlPressed = false;
        }
    });

    // CLIENT INPUT EVENTS
    ////////////////////////////////////////////////////////////

    
    ////////////////////////////////////////////////////////////
    // MOCKET EVENT BINDINGS

    mocket = MULTIO.listen(socket);

    mocket.on({
        'dudl-hideCanvas': ui.hideCanvas,
        'dudl-showCanvas': ui.showCanvas,
        'dudl-drawLines': ui.drawLines,
        'dudl-punchIn': function () {
            hist.punchIn();
        },
        'dudl-punchOut': function () {
            hist.punchOut();
        },
        'dudl-undo': ui.undo,
        'dudl-redo': ui.redo
    });

    // MOCKET EVENT BINDINGS
    ////////////////////////////////////////////////////////////

    return this;
};
