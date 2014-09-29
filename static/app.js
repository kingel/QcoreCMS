var app = require('http').createServer(handler),
    io = require('socket.io').listen(app),
    path = require('path'),
    fs = require('fs');

app.listen(8080);

var mastermind = {
    tasks: {},
    lines: [],
    rowlabels: ['Yadi', 'Franklin', 'Ralph', 'Roel', 'Maarten', 'Rob', 'Sjoerd', 'Jeroen'],
    columnlabels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    columnparts: 2,
    statuslabels: ['Todo', 'On hold', 'Next week', 'Done'],
    statusheight: 30
};

function handler (request, response) {
    var filePath = '.' + request.url;
    if (filePath == './')
        filePath = './index.html';

    var extname = path.extname(filePath);
    var contentType = 'text/html';
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
    }

    path.exists(filePath, function(exists) {
        if (exists) {
            fs.readFile(filePath, function(error, content) {
                if (error) {
                    response.writeHead(500);
                    response.end();
                }
                else {
                    response.writeHead(200, { 'Content-Type': contentType });
                    response.end(content, 'utf-8');
                }
            });
        }
        else {
            response.writeHead(404);
            response.end();
        }
    });
}

io.sockets.on('connection', function (socket) {

    socket.on('addTask', function (data) {
        mastermind.tasks[data.id] = {
            'description': data.description,
            'type': data.type,
            'x': data.x,
            'y': data.y
        };
        socket.emit('addTask', {
            'id': data.id,
            'description': data.description,
            'type': data.type,
            'x': data.x,
            'y': data.y
        });
        socket.broadcast.emit('addTask', {
            'id': data.id,
            'description': data.description,
            'type': data.type,
            'x': data.x,
            'y': data.y
        });
    });

    socket.on('editTask', function (data) {
        mastermind.tasks[data.id].description = data.description;
        mastermind.tasks[data.id].type = data.type;
        socket.broadcast.emit('editTask', {
            'id': data.id,
            'description': data.description,
            'type': data.type
        });
    });

    socket.on('deleteTask', function (data) {
        delete mastermind.tasks[data.id];
        socket.broadcast.emit('deleteTask', {'id': data.id});
    });

    socket.on('initTasks', function (data) {
        socket.emit('clearTasks', {});
        socket.emit('drawBackground', {
            rowlabels: mastermind.rowlabels,
            columnlabels: mastermind.columnlabels,
            columnparts: mastermind.columnparts,
            statuslabels: mastermind.statuslabels,
            statusheight: mastermind.statusheight
        });
        for (var taskid in mastermind.tasks) {
            var task = mastermind.tasks[taskid]
            socket.emit('addTask', {
                'id': taskid,
                'description': task.description,
                'type': task.type,
                'x': task.x,
                'y': task.y
            });
        }
        for (var i = 0; i < mastermind.lines.length; i++) {
            var line = mastermind.lines[i]
            socket.emit('drawLine', {
                'userid': 0,
                'x': line.x,
                'y': line.y,
                'x_to': line.x_to,
                'y_to': line.y_to,
                'color': line.color
            });
        }
    });

    socket.on('setBackground', function (data) {
        mastermind.rowlabels = data.rowlabels;
        mastermind.columnlabels = data.columnlabels;
        mastermind.columnparts = data.columnparts;
        mastermind.statuslabels = data.statuslabels;
        mastermind.statusheight = data.statusheight;
        socket.broadcast.emit('drawBackground', {
            rowlabels: mastermind.rowlabels,
            columnlabels: mastermind.columnlabels,
            columnparts: mastermind.columnparts,
            statuslabels: mastermind.statuslabels,
            statusheight: mastermind.statusheight
        });
    });

    socket.on('clearAll', function (data) {
        mastermind.lines = [];
        socket.broadcast.emit('clearAll', {});
    });

    socket.on('drawLine', function (data) {
        mastermind.lines.push({
            'x': data.x,
            'y': data.y,
            'x_to': data.x_to,
            'y_to': data.y_to,
            'color': data.color
        });
        socket.broadcast.emit('drawLine', {
            'userid': data.userid,
            'x': data.x,
            'y': data.y,
            'x_to': data.x_to,
            'y_to': data.y_to,
            'color': data.color
        });
    });

    socket.on('moveTask', function (data) {
        mastermind.tasks[data.id].x = data.x;
        mastermind.tasks[data.id].y = data.y;
        socket.broadcast.emit('moveTask', {'userid': data.userid, 'id': data.id, 'x': data.x, 'y': data.y});
    });
});
