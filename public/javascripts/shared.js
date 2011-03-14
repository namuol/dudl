// Shared between client and server.

function DummyDebug() {
    this.out = function() {};
    this.err = function() {};
};

function DudlHistory(debug, msgs_in, hpos_in, punchedIn_in) {
    var msgs = msgs_in || [];
    this.msgs = msgs;
    this.punchedIn = punchedIn_in || false;
    var hpos = hpos_in !== undefined ? hpos_in : -1;

    function cleanMsgs() {
        // TODO
    };
    this.cleanMsgs = cleanMsgs;

    function _hpos() {
        return hpos;
    };
    this.hpos = _hpos;

    function canUndo() {
        return hpos >= 0;
    };
    this.canUndo = canUndo;

    function doUndo(callback) {
        if(canUndo()) {
            if(typeof(callback) == 'function') {
                for(var i=0; i < hpos && msgs[i] != undefined; ++i) {
                        callback(msgs[i]);
                }
            }
            --hpos;
        }
    };
    this.doUndo = doUndo;

    function canRedo() {
        return typeof(msgs[hpos+1]) !== 'undefined' 
            && msgs[hpos+1] != null;
    };
    this.canRedo = canRedo;

    function doRedo(callback) {
        if(canRedo()){
            if(typeof(callback) == 'function') {
                callback(msgs[hpos+1]);
            }
            ++hpos;
        }
    };
    this.doRedo = doRedo;

    function doCommand(msg) {
        if(eval('typeof('+msg.type+')') == 'function') {
            eval(msg.type + '(msg.data);');
        }
    };
    this.doCommand = doCommand;
    
    // COMMAND TRACKING ////
    function punchIn(args) {
        // ARGS ////////////
        var data = args.data;
        var type = args.type;
        // ARGS ////////////
        punchedIn = true;
        ++hpos;
        msgs[hpos] = {
            type: type,
            data: data
        };
        msgs[hpos+1] = undefined;
    };

    function punchOut(args) {
        punchedIn = false;
    };

    function drawLine(args) {
        // ARGS //////////
        var x1 = args.x1,
            x2 = args.x2,
            y1 = args.y1,
            y2 = args.y2;
        // ARGS //////////
        if(punchedIn) {
            //debug.err(JSON.stringify(msgs));
            msgs[hpos].data.lines.push({
                x1:x1, x2:x2,
                y1:y1, y2:y2
            });
        }
    };

    return true;
};
