/*jslint
    white: true,
    onevar: true,
    undef: true,
    newcap: true,
    nomen: false,
    regexp: true,
    plusplus: true,
    bitwise: true,
    maxerr: 50,
    indent: 4 */

/*global
    setTimeout,
    console,
    __dirname,
    require,
    module*/

var HIST = {};

if (typeof module !== 'undefined') { 
    module.exports = HIST;
}

HIST.track = function () {
    var hist = [],
        hpos = -1,
        punchedIn = false;

    function wrap(func) {
        return function () {
            func.apply(func, arguments);

            if (punchedIn) {
                hist[hpos].push({
                    func: func,
                    args: arguments
                });
            }
        }; 
    }

    function punchIn() {
		punchedIn = true;
        hpos += 1;
        hist[hpos] = [];
        hist[hpos + 1] = undefined;
    }

    function punchOut(callback) {
        punchedIn = false;
    }

    function canUndo() {
        return hpos < 0;
    }

    function undo() {
        if (canUndo()) {
            return;
        }
        var i, j;
        for (i = 0;
            i < hpos &&
            (typeof hist[i] !== 'undefined');
            i += 1)
        {
            for (j = 0; j < hist[i].length; j += 1) {
                hist[i][j].func.apply(hist[i][j].func, hist[i][j].args);
            }
        }

        hpos -= 1;
    }
    
    function redo() {
        if (typeof hist[hpos + 1] !== 'undefined' && hist[hpos + 1] !== null) {
            for (var i = 0; i < hist[hpos + 1].length; i += 1) {
                hist[hpos + 1][i].func.apply(hist[hpos + 1][i].func, hist[hpos + 1][i].args);
            }
            hpos += 1;
        }
    }

    return {
        hist: hist,
        wrap: wrap,
        punchIn: punchIn,
        punchOut: punchOut,
        isPunchedIn: function () {
            return punchedIn;
        },
        canUndo: canUndo,
        undo: undo,
        redo: redo
    };
};
