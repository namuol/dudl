function uchat(container, buildUI) {
    buildUI = typeof(buildUI) === 'undefined' ? false : true;

    var status_msg,
        join_form,
        name,
        chat_panel,
        msgs,
        msg_bar,
        msg_form,
        msg_text;

    if( buildUI ) {
        status_msg = document.createElement('div');
        $(status_msg).addClass('status-msg');
        $(container).append(status_msg);

        join_form = document.createElement('form');
        $(join_form).addClass('join-form');
        $(container).append(join_form);

        name = document.createElement('input');
        $(name).attr('type', 'text');
        $(name).addClass('name');
        $(join_form).append(name);

        chat_panel = document.createElement('div');
        $(chat_panel).addClass('chat-panel');
        $(container).append(chat_panel);

        msgs = document.createElement('ul');
        $(msgs).addClass('msgs');
        $(chat_panel).append(msgs);

        msg_bar = document.createElement('div');
        $(msg_bar).addClass('msg-bar');
        $(chat_panel).append(msg_bar);

        msg_form = document.createElement('form');
        $(msg_form).addClass('msg-form');
        $(msg_bar).append(msg_form);

        msg_text = document.createElement('input');
        $(msg_text).attr('type', 'text');
        $(msg_text).addClass('msg-input');
        $(msg_form).append(msg_text);

    } else {
        status_msg = $(container).children('.status-msg');
        join_form = $(container).children('form.join-form');
        name = $(join_form).children('input[type=text].name');
        chat_panel = $(container).children('.chat-panel');
        msgs = $(chat_panel).children('ul.msgs');
        msg_bar = $(chat_panel).children('.msg-bar')
        msg_form = $(msg_bar).children('form.msg-form')
        msg_text = $(msg_form).children('input[type=text].msg-input');
    }

    // Expose the UI:
    this.status_msg = status_msg;
    this.join_form = join_form;
    this.name = name;
    this.chat_panel = chat_panel;
    this.msgs = msgs;
    this.msg_bar = msg_bar;
    this.msg_form = msg_form;
    this.msg_text = msg_text;


    $(chat_panel).addClass('disabled');
    $(name).hide();
    $(status_msg).html('connecting...');

    timestamps('off');

    /////////////////////////////////////////
    // SOCKET.IO
    /*
    socket.on('connect', function(){
        $(status_msg).html('who are you?');
        $(status_msg).show();
        $(join_form).show();
        $(name).focus();
        $('input').attr('disabled',false);
    });

    socket.on('message',function(data){
        switch(data.type) {
        case 'joined':
        case 'left':
        case 'msg':
            jtpl = jQuery.createTemplate($('#'+data.type+'-jtpl').val());
            txt = jQuery.processTemplateToText(jtpl, data);
            $(msgs).append(txt);
            
            $(msgs)[0].scrollTop = $(msgs)[0].scrollHeight;
            $(msg_text).focus();
            break;
        default:
            break;
        }
    });

    socket.on('disconnect', function() {
        $(status_msg).html('error/disconnected :(');
        $(status_msg).show();
        $('input').attr('disabled','disabled');
        $('body').addClass('disabled');
        userError('disconnected :(');
    });
    
    if(!socket.connected) {
        socket.connect();
    }
    */
    // SOCKET.IO
    /////////////////////////////////////////

    /////////////////////////////////////////
    // UI BEHAVIOR
    var msgHistory = [];
    this.msgHistoryPos = 0;
    var currentMsg = '';

    // Expose some UI behavioral variables:
    this.msgHistory = msgHistory;

    $(msg_text).attr('autocomplete','off');
    $(msg_text).attr('disabled','disabled');

    $(name).focus();

    function userError(msg) {
        userMsg(msg, '#cmd-err-jtpl');
    };

    function userMsg(msg, tmpl) {
        tmpl = tmpl || '#cmd-jtpl';
        var jtpl = jQuery.createTemplate($(tmpl).val());
        var txt = jQuery.processTemplateToText(jtpl, {msg:msg});
        $(msgs).append(txt);
        
        $(msgs)[0].scrollTop = $(msgs)[0].scrollHeight;
        $(msg_text).focus();
    };

    /////////////////////////////////////////////////////////////////////
    // COMMANDS
    function help() {
        for(var key in commands) {
            userMsg(commands[key].usage);
        };
    };

    function timestamps(onOrOff) {
        if(onOrOff == 'on') {
            $(msgs).removeClass('timestamps-off');
        } else if(onOrOff == 'off') {
            $(msgs).addClass('timestamps-off');
        } else {
            userError('Use "on" or "off"');
        }
    };

    var commands = {
        help: {
            usage: "/help .............. list all available commands",
            func: help
        },

        timestamps: {
            usage: "/timestamps on|off . toggle timestamp visibility",
            func: timestamps
        }
    };

    // COMMANDS
    /////////////////////////////////////////////////////////////////////

    function tryToDoCommand(msg) {
        var cmd = msg.substring(1);
        var cmdName = cmd.split(' ')[0];
        var evalCmd1 = 'typeof(commands.' + $.trim(cmdName) + ')';
        var evalCmd2 = 'typeof(commands.' + $.trim(cmdName) + '.func)';
        if(eval(evalCmd1) === 'object' && 
           eval(evalCmd2) === 'function') {
            var cmdString = 'commands.' + cmdName + '.func(';
            var args = _.without(_.rest(cmd.split(' ')),'').map(function(n) {
                return '"'+n+'"';
            });
            cmdString += args.join(',')
            cmdString += ');'
            eval(cmdString);
        } else { 
            userError('Unknown command: ' + cmd);
        }
    };
    this.tryToDoCommand = tryToDoCommand;

    $(msg_text).keydown(function(e) {
        switch(e.keyCode) {
        case 38: // UP
            if(this.msgHistoryPos >= msgHistory.length) {
                currentMsg = $(msg_text).val();
            }
            this.msgHistoryPos = this.msgHistoryPos <= 0 ? 0 : this.msgHistoryPos - 1;
            $(msg_text).focus();
            $(msg_text).val(msgHistory[this.msgHistoryPos]);
            return false;
            break;
        case 40: // DOWN
            if(this.msgHistoryPos <= msgHistory.length) {
                this.msgHistoryPos = this.msgHistoryPos >= msgHistory.length
                    ? msgHistory.length
                    : this.msgHistoryPos + 1;
                $(msg_text).focus();
                $(msg_text).val(msgHistory[this.msgHistoryPos]);
            } else {
                $(msg_text).focus();
                $(msg_text).val(currentMsg);
            }
            return false;
            break;
        default:
            currentMsg = $(msg_text).val();
        } 
    });
    // UI BEHAVIOR
    /////////////////////////////////////////

    function timeString(time) {
        d = new Date(time);
        h = d.getHours();
        h = h < 10 ? "0" + h : h;
        m = d.getMinutes();
        m = m < 10 ? "0" + m : m;
        s = d.getSeconds();
        s = s < 10 ? "0" + s : s;
        return h + ":" + m + ":" + s;
    };
    this.timeString = timeString;

    return true;
};


