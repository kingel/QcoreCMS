(function ($) {

    var default_settings = {
        rowlabels: ['John', 'Jack', 'Bob', 'George'],
        columnlabels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        columnparts: 2,
        notecategories: ['Feature', 'User Story', 'Spike', 'Dependency'],
        statuslabels: ['Todo', 'Done'],
        statusheight: 30,
        title: 'My Planner',
        description: ''
    };

    // Create the np namespace
    $.np = $.extend({
        current: undefined,
        canvas: undefined,
        context: undefined,
        started: false,
        color: '#000000',
        tool: 'brush',
        socket: undefined,
        connected: false,
        x: 0,
        y: 0,
        userid: ''
    }, default_settings);

    /**
     * Initialize np
     *
     * @id jQuery.np.init
     */
    $.np.init = function () {

        $('[href=#page-addplanner]').click(function () {
            $.np.socket.emit('addPlanner', $.extend({
                'id': uuid()
            }, default_settings));
        });

        $('[href=#page-deleteplanner]').click(function () {
            $.np.socket.emit('deletePlanner', {});
        });

        $('[href=#page-prevplanner]').click(function () {
            $.np.socket.emit('prevPlanner', {});
        });

        $('[href=#page-nextplanner]').click(function () {
            $.np.socket.emit('nextPlanner', {});
        });

        $('#page-addnote .save').click(function () {
            var description = nl2br($('#page-addnote #notedescription').val());
            var type = $('#page-addnote input:radio[name=notetype]:checked').val();
            var x = 172;
            var y = 8;

            $.np.socket.emit('addNote', {
                'id': uuid(),
                'description': description,
                'type': type,
                'x': x,
                'y': y
            });
        });

        $('#page-addnote').live('pagebeforeshow',function(event){

            // Reset fields
            $('#page-addnote #notedescription').val('');
            $('#page-addnote #notetype-development').attr('checked', true);
            $('#page-addnote input[name=notetype]').checkboxradio("refresh");
        });

        $('#page-editnote .save').click(function () {
            var description = nl2br($('#page-editnote #notedescription').val());
            var type = $('#page-editnote input:radio[name=notetype]:checked').val();
            var id = $.np.current.attr('id');

            $.np.editNote(id, description, type);
            $.np.socket.emit('editNote', {
                'id': id,
                'description': description,
                'type': type
            });
        });

        $('#page-editnote').live('pagebeforeshow',function(event){

            // Reset fields
            $('#page-editnote #notedescription').val(br2nl($.np.current.html()));
            if ($.np.current.hasClass('note-development')) {
                $('#page-editnote #notetype-development').attr('checked', true);
            }
            if ($.np.current.hasClass('note-projectmanagement')) {
                $('#page-editnote #notetype-projectmanagement').attr('checked', true);
            }
            if ($.np.current.hasClass('note-meeting')) {
                $('#page-editnote #notetype-meeting').attr('checked', true);
            }
            if ($.np.current.hasClass('note-other')) {
                $('#page-editnote #notetype-other').attr('checked', true);
            }
            $('#page-editnote input[name=notetype]').checkboxradio("refresh");
        });

        $('#page-settings ul li a').live('click', function(event) {
            var selected = $(this).text(),
                text,
                classtag;

            $('.content-secondary ul li').each(function () {
                text = $(this).text();
                if (text === selected) {
                    classtag = ' data-theme="b"';
                } else {
                    classtag = '';
                }
                if (text !== 'Settings') {
                    $(this).replaceWith('<li' + classtag +
                                        '><a href="#settings-' +
                                        text.toLowerCase() +
                                        '">' + text + '</a></li>');
                }
            });
            $('.content-secondary ul').listview('refresh');
            $('.selected-panel').removeClass('selected-panel');
            $('#settings-' + selected.toLowerCase()).addClass('selected-panel');
        });

        $('#page-settings').live('pagebeforeshow',function(event){
            var text, classtag;

            // Show correct tab
            $('.selected-panel').removeClass('selected-panel');
            $('#settings-basic').addClass('selected-panel');
            $('.content-secondary ul li').each(function () {
                text = $(this).text();
                if (text === 'Basic') {
                    classtag = ' data-theme="b"';
                } else {
                    classtag = '';
                }
                if (text !== 'Settings') {
                    $(this).replaceWith('<li' + classtag +
                                        '><a href="#settings-' +
                                        text.toLowerCase() +
                                        '">' + text + '</a></li>');
                }
            });
            $('.content-secondary ul').listview('refresh');

            // Reset fields
            $('#page-settings #notecategories').val($.np.notecategories.join('\n'));
            $('#page-settings #columnlabels').val($.np.columnlabels.join('\n'));
            $('#page-settings #columnparts').val($.np.columnparts).slider('refresh');
            $('#page-settings #rowlabels').val($.np.rowlabels.join('\n'));
            $('#page-settings #statuslabels').val($.np.statuslabels.join('\n'));
            $('#page-settings #statusheight').val($.np.statusheight).slider('refresh');
            $('#page-settings #title').val($.np.title);
            $('#page-settings #description').val($.np.description);
        });

        $('#page-settings .save').click(function () {
            $.np.notecategories = $('#page-settings #notecategories').val().split('\n');
            $.np.columnlabels = $('#page-settings #columnlabels').val().split('\n');
            $.np.columnparts = parseInt($('#page-settings #columnparts').val());
            $.np.rowlabels = $('#page-settings #rowlabels').val().split('\n');
            $.np.statuslabels = $('#page-settings #statuslabels').val().split('\n');
            $.np.statusheight = parseInt($('#page-settings #statusheight').val());
            $.np.title = $('#page-settings #title').val();
            $.np.description = $('#page-settings #description').val();
            $.np.socket.emit('setBackground', {
                rowlabels: $.np.rowlabels,
                columnlabels: $.np.columnlabels,
                columnparts: $.np.columnparts,
                notecategories: $.np.notecategories,
                statuslabels: $.np.statuslabels,
                statusheight: $.np.statusheight,
                title: $.np.title,
                description: $.np.description
            });
            $.np.drawBackground();
        });

        $('#page-editnote .delete').click(function () {
            var id = $.np.current.attr('id');
            $.np.socket.emit('deleteNote', {
                'id': id
            });
            $.np.current.remove();
        });

        $('.note').live('mousedown',function(event){
            $.np.current = $(this);
        });

        $.np.canvas = $('#canvasArea');
        $.np.context = $.np.canvas.get(0).getContext('2d');
        $.np.canvas.mousedown(function (event) {
            if (event.layerX || event.layerX == 0) { // Firefox
                event._x = event.layerX;
                event._y = event.layerY;
            } else if (event.offsetX || event.offsetX == 0) { // Opera
                event._x = ev.offsetX;
                event._y = ev.offsetY;
            }
            $.np.started = true;
            $.np.x = event._x;
            $.np.y = event._y;
        });
        $.np.canvas.mousemove(function (event) {
            if (event.layerX || event.layerX == 0) { // Firefox
                event._x = event.layerX;
                event._y = event.layerY;
            } else if (event.offsetX || event.offsetX == 0) { // Opera
                event._x = ev.offsetX;
                event._y = ev.offsetY;
            }
            if ($.np.started) {
                if ($.np.tool == 'erase') {
                    $.np.socket.emit('drawLine', {
                        'userid': $.np.userid,
                        'x': event._x,
                        'y': event._y,
                        'x_to': event._x,
                        'y_to': event._y,
                        'color': 'erase'
                    });
                    $.np.drawLine(event._x, event._y, event._x, event._y, 'erase');
                } else {
                    $.np.socket.emit('drawLine', {
                        'userid': $.np.userid,
                        'x': $.np.x,
                        'y': $.np.y,
                        'x_to': event._x,
                        'y_to': event._y,
                        'color': $.np.color
                    });
                    $.np.drawLine($.np.x, $.np.y, event._x, event._y, $.np.color);
                    $.np.x = event._x;
                    $.np.y = event._y;
                }
            }
        });
        $.np.canvas.mouseup(function (event) {
            if ($.np.started) {
                $.np.started = false;
            }
        });

        $('#paint-tool').change(function () {
            if ($(this).val() == 'erase') {
                $.np.tool = 'erase';
            } else if ($(this).val() == 'clear') {
                $.np.clearLines();
                $.np.socket.emit('clearLines', {});
                $(this)[0].selectedIndex = 0;
                $(this).selectmenu("refresh");
                $(this).change();
            } else {
                $.np.tool = 'brush';
                $.np.color = $(this).val();
            }
        })

        $.np.handlers = {};
        $.np.socket = new SockJS('http://localhost:8080/test');

        $.np.userid = uuid();

        $.np.socket.onopen = function () {
            if ($.cookie('np_plannerid')) {
                $.np.send('initNotes',
                           {plannerid: $.cookie('np_plannerid')});
            } else {
                $.np.send('initNotes', {plannerid: ''});
            }
        };

        $.np.socket.onclose = function () {
            // Remove socket
            // delete np.socket;

            // if (module.auto_reconnect) {
            //     $(window).trigger('disconnected');

            //     // try to reconnect, but throttle a bit
            //     window.setTimeout(function () {
            //         module.connect(module.url);
            //     }, 5000);
            // }
        };

        // Handler when a message arrives
        $.np.socket.onmessage = function (data) {
            data = data.data
            console.log(data.data)
            // Call handler if available
            if (typeof $.np.handlers[data.method] === 'function') {
                $.np.handlers[data.method](data.data,
                                             data.method,
                                             data.userdata,
                                             data.status);
            }

            // // Check if the message id is in the data
            // if (data.userdata && data.userdata.messageid) {

            //     // Call success handler and remove it
            //     if (module.success[data.userdata.messageid]) {
            //         module.success[data.userdata.messageid](data.data,
            //                                                 data.method,
            //                                                 data.userdata,
            //                                                 data.status);
            //         delete module.success[data.userdata.messageid];
            //     }

            //     // Call error handler and remove it
            //     if (module.error[data.userdata.messageid]) {
            //         module.error[data.userdata.messageid](data.data,
            //                                               data.method,
            //                                               data.userdata,
            //                                               data.status);
            //         delete module.error[data.userdata.messageid];
            //     }
            // }
        };

        $.np.send = function (method, data, success, error) {
            // if (!module.online()) {
            //     module.queue.push([method, data, success, error]);
            //     return;
            // }

            var messageid = uuid();

            // Add success handler
            if (typeof success !== 'undefined') {
                $.np.success[messageid] = success;
            }

            // Add error handler
            if (typeof error !== 'undefined') {
                $.np.error[messageid] = error;
            }

            // Set default values
            data = data || {};

            // Send message to backend
            $.np.socket.send(JSON.stringify({
                method: method,
                data: data,
                userdata: {
                    messageid: messageid
                }
            }));
        };

        $.np.socket.emit = function(method, data) {
            console.log(method, data);
            $.np.send(method, data);
        };

        $.np.handlers['noPlanners'] = function(data) {
            $.np.socket.emit('addPlanner', $.extend({
                'id': uuid()
            }, default_settings));
        };

        $.np.handlers['moveNote'] = function(data) {
            if (data.userid != $.np.userid) {
                $('#' + data.id).css({
                    'top': data.y,
                    'left': data.x
                });
            }
        };

        $.np.handlers['addNote'] = function(data) {
            $.np.addNote(data.id, unescape(data.description), data.type, data.x, data.y);
        };

        $.np.handlers['editNote'] = function(data) {
            $.np.editNote(data.id, unescape(data.description), data.type);
        };

        $.np.handlers['deleteNote'] = function(data) {
            $.np.deleteNote(data.id);
        };

        $.np.handlers['clearLines'] = function(data) {
            $.np.clearLines();
        };

        $.np.handlers['clearNotes'] = function(data) {
            $('.note').remove();
        };

        $.np.handlers['drawBackground'] = function(data) {
            $.np.rowlabels = data.rowlabels;
            $.np.columnlabels = data.columnlabels;
            $.np.columnparts = data.columnparts;
            $.np.notecategories = data.notecategories;
            $.np.statuslabels = data.statuslabels;
            $.np.statusheight = data.statusheight;
            $.np.title = data.title;
            $.np.currentindex = data.current;
            $.np.total = data.total;
            $.np.description = data.description;
            $.np.drawBackground();
            $.np.positionPane();
            $.cookie('np_plannerid', data._id, {path: '/' });
        };

        $.np.handlers['drawLine'] = function(data) {
            if (data.userid != $.np.userid) {
                $.np.drawLine(data.x, data.y, data.x_to, data.y_to, data.color);
            }
        };

    };

    $.np.drawBackground = function () {
        var top_table = $('.top-table'),
            bottom_table = $('.bottom-table'),
            cols = $.np.columnlabels.length * $.np.columnparts,
            colparts = cols + $.np.columnparts,
            colwidth = parseInt(1024 / colparts),
            html = '',
            i,
            j,
            statusheight = parseInt(576 / 100 * $.np.statusheight);

        html = '<colgroup><col width="*"/>';
        for (i = 0; i < cols; i++) {
            html += '<col width="' + colwidth + '"/>';
        }
        html += '</colgroup>';

        html += '<tr><th class="ui-bar-b">&nbsp</th>';
        $($.np.columnlabels).each(function () {
            html += '<th colspan="' +
                    $.np.columnparts +
                    '" class="ui-bar-b">' +
                    this +
                    '</th>';
        });
        html += '</tr>';

        top_table.html(html);

        $($.np.rowlabels).each(function () {
            $.np.addRow(this);
        });

        html = '<colgroup><col width="*"/>';
        colwidth = parseInt(1024 / $.np.statuslabels.length);
        for (i = 1; i < $.np.statuslabels.length; i++) {
            html += '<col width="' + colwidth + '"/>';
        }
        html += '</colgroup>';

        html += '<tr>';
        $($.np.statuslabels).each(function () {
            html += '<td class="ui-bar-c">' + this + '</td>';
        });
        html += '</tr>';

        bottom_table.html(html);
        if (statusheight === 0) {
            bottom_table.hide();
        } else {
            bottom_table.show();
            bottom_table.css('height', statusheight);
        }
        top_table.css('height', 576 - statusheight);
        $('.page-planner h1').html($.np.title + ' (' + $.np.currentindex +
                                   '/' + $.np.total + ')');
    };

    $.np.clearLines = function () {
        $.np.context.clearRect(0, 0, 1024, 630);
    };

    $.np.drawLine = function (x, y, x_to, y_to, color) {
        if (color == 'erase') {
            $.np.context.clearRect(x - 16, y - 16, 32, 32);
        } else {
            $.np.context.beginPath();
            $.np.context.moveTo(x, y);
            $.np.context.lineTo(x_to, y_to);
            $.np.context.strokeStyle = unescape(color);
            $.np.context.stroke();
        }
    };

    $.np.editNote = function (id, description, type) {
        $('#' + id).html(description);
        $('#' + id).removeClass('note-development note-projectmanagement note-meeting note-other');
        $('#' + id).addClass('note-' + type);
    };

    $.np.deleteNote = function (id) {
        $('#' + id).remove();
    };

    $.np.addNote = function (id, description, type, x, y) {
        console.log("Adding de padding")
        var newNote = $('<a data-rel="dialog" data-transition="flip" href="#page-editnote" class="note"></a>');
        $('.pane').append(newNote);
        newNote.draggable({
            drag: function(event, ui) {
                var elm = $(this);
                $.np.socket.emit('moveNote', {
                    'userid': $.np.userid,
                    'id': elm.attr('id'),
                    'x': ui.position.left,
                    'y': ui.position.top
                });
            }
        });
        newNote.css({
            'left': x,
            'top': y
        })
        newNote.html(description);
        newNote.addClass('note-' + type);
        newNote.attr({'id': id});
    }

    $.np.positionPane = function () {
        var header_height = 42,
            pos_y = parseInt(($(window).height() - header_height - 576) / 2) + header_height,
            pos_x = parseInt(($(window).width() - 1024) / 2);

        if (pos_y < header_height) {
            pos_y = header_height;
        }
        if (pos_x < 0) {
            pos_x = 0;
        }
        $('.pane').css({'top': pos_y, 'left': pos_x});
        $('.pane').show();
    };

    $(window).resize($.np.positionPane);

    $.np.addRow = function (rowlabel) {
        var html = '<tr><td class="ui-bar-d">' +
                   rowlabel +
                   '</th>',
            i;
        for (i = 0; i < $.np.columnlabels.length * $.np.columnparts; i++) {
            html += '<td class="ui-bar-c">&nbsp;</td>';
        }
        html += '</tr>';

        $('.top-table').append(html);
    };

    // Init on load
    $(window).load(function () {
        $.np.init();
    });

    function br2nl(input) {
        return input.replace(/<br(\s+)?\/?>/ig, "\n");
    }
    function nl2br(input) {
        return input.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br/>')
    }
    function uuid() {
        var s = [], itoh = '0123456789ABCDEF';

        for (var i = 0; i <36; i++) s[i] = Math.floor(Math.random()*0x10);
        s[14] = 4;
        s[19] = (s[19] & 0x3) | 0x8;
        for (var i = 0; i <36; i++) s[i] = itoh[s[i]];
        s[8] = s[13] = s[18] = s[23] = '-';
        return s.join('');
    }

}(jQuery));
