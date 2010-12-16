// Debug output etc:
function debug(str) {
    var d = $('#debug')[0];
    str = (str + '\n').replace('\n','<br>');
    $('#debug').append(str);
    d.scrollTop = d.scrollHeight;
};

function error(str) {
    debug('<span class="err">'+str+'</span>');
};

function DudlPad(canvas, width, height, socket) {
    canvas.width = width;
    canvas.height = height;
    this.socket = socket;
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.context.lineWidth = 4.0;
    this.context.lineCap = 'round';
    this.context.lineJoin = 'round';
    this.drawing = false;

    var that = this;
    this.context.strokeStyle = "#123456";

    $(this.canvas).mousedown(function(e) {
        that.mouseX = e.pageX - that.canvas.offsetLeft;
        that.mouseY = e.pageY - that.canvas.offsetTop;

        that.mouseHeld = true;
        that.drawing = true;
    });

    $(this.canvas).mousemove(function(e) {

        if(that.drawing) {
            var x = e.pageX - that.canvas.offsetLeft;
            var y = e.pageY - that.canvas.offsetTop;
            
            that.socket.send({
                type: 'drawLine',
                x1: that.mouseX,
                y1: that.mouseY,
                x2: x,
                y2: y
            });

            that.drawLine(that.mouseX,that.mouseY, x,y);
            that.mouseX = x;
            that.mouseY = y;
        }
    });

    $(this.canvas).mouseup(function(e) {
        that.mouseHeld = false;
        that.drawing = false;
    });

    $(this.canvas).mouseleave(function(e) {
        that.drawing = false;
    });

    $(this.canvas).mouseenter(function(e) {
        if(that.mouseHeld) {
            that.drawing = true;
        }
    });

    this.socket.on('message', function(data) {
        switch(data.type) {
        case 'drawLine':
            that.drawLine(data.x1,data.y1,data.x2,data.y2);
            break;
        }
    });

    return true;
};

DudlPad.prototype.setDrawStyle = function(lineWidth, color) {
    this.canvas.lineWidth = lineWidth;
    this.canvas.strokeStyle = color;
    this.canvas.fillStyle = color;
};

DudlPad.prototype.drawLine = function(x1,y1,x2,y2) {
    var ctx = this.context;
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.closePath();
    ctx.stroke();
};
