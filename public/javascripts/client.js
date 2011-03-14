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
    module
    document
    window
    $
    jQuery
    setTimeout*/

var DUDL = {};

DUDL = function (outer_container, width, height, uchat, socket, debug) {
    var ui,
        mocket;

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

    // UTILITY FUNCTIONS
    ////////////////////////////////////////////////////////////

    ui = (function () {
        // Create inner container:
        var container = document.createElement('div'),
            canvas = document.createElement('canvas'),
            context = canvas.getContext('2d'),
            msg_container = document.createElement('ul');

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

        return this;
    }());


    ////////////////////////////////////////////////////////////
    // CLIENT INPUT EVENTS

    $(window).resize(function (e) {
        resizeCanvas(ui);
    });

    // CLIENT INPUT EVENTS
    ////////////////////////////////////////////////////////////

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

    function drawLines(coords) {
        var ctx = ui.context,
            i;
        ctx.beginPath();
        for (i = 0; i < coords.length; i += 4) {
            ctx.moveTo(coords[i], coords[i + 1]);
            ctx.lineTo(coords[i + 2], coords[i + 3]);
        }
        ctx.closePath();
        ctx.stroke();
    }

    // REMOTE-ABLE EVENT FUNCTIONS
    ////////////////////////////////////////////////////////////
    
    ////////////////////////////////////////////////////////////
    // MOCKET EVENT BINDINGS

    mocket = MULTIO.listen(socket);

    mocket.on({
        'dudl-hideCanvas': hideCanvas,
        'dudl-showCanvas': showCanvas,
        'dudl-drawLines': drawLines
    });

    // MOCKET EVENT BINDINGS
    ////////////////////////////////////////////////////////////

    return this;
};
