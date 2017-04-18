var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var DB = require('./db');
var UTIL = require('./util');

app.get("/", function(req,res){
	res.render("chat");
});

var usuariosOnline = [];
io.on('connection', function(socket) {

	UTIL.mensaje("Connection OK");

	socket.on("loginUser", function(user){
		user = JSON.parse(user);
		var index = UTIL.getIndex(usuariosOnline[user.id]);
		socket.user = user;
		socket.index = index;

		if(usuariosOnline[user.id]==undefined){
			usuariosOnline[user.id] = [];
		}

		UTIL.mensaje("Usuario Logeado", user);
		UTIL.mensaje("Hilo No. "+index, user);
		usuariosOnline[user.id].push(socket);
		socket.broadcast.emit("addUserToListchat", JSON.stringify(user));
		//enviar lista de usuarios
		DB.getAllUser(user.id, function(rows){
			var row;
			for (var i = 0; i < rows.length; i++) {
				row = rows[i];
				row.estado = usuariosOnline[row.id]?1:0;
			}
			socket.emit("updateListchat", JSON.stringify(rows));
		});

		/*var row = []
		for(var uo in usuariosOnline){
			if(uo!=socket.user.id){
				row.push(usuariosOnline[uo][0].user);
			}
		}

		socket.emit("updateListchat", JSON.stringify(row));*/
	});

	socket.on("logoutUser", function(user){
		user = JSON.parse(user);
		var socket = usuariosOnline[user.id][0];
		socket.disconnect();
	});
 
	socket.on('sendMessageToUser', function(data) {
		var data = JSON.parse(data);
		var s = usuariosOnline[data.id];
		var row = {de_id: data.user.id, para_id: data.id, mensaje: data.mensaje, visto: 0};
		if(s){
			UTIL.mensaje("Enviando mensaje de: "+data.user.id+" a: " + data.id);
			DB.saveMessage(row, function(id){
				data.mensaje_id = id;
				for (var i = 0; i < s.length; i++) {
					s[i].emit("getMessageFromUser", JSON.stringify(data));
				}
			});
		}else{
			UTIL.mensaje("usuario "+data.id+" no logeado, se guarda mensaje");
			DB.saveMessage(row);
		}
	});
 
	socket.on('updateMessageView', function(id) {
		DB.updateMessageView(id);
	});

	socket.on('getMessagesFromUser', function(data) {
		DB.getMessagesFromUser(data.de_id, data.para_id, function(rows){
			s = usuariosOnline[socket.user.id];
			for (var i = 0; i < s.length; i++) {
				s[i].emit("sendMessagesFromUser", JSON.stringify(rows));
			}
		});
	});

	socket.on("disconnect", function() {
		if(typeof(socket.user) == "undefined"){
			return;
		}
		UTIL.mensaje("Usuario desconectado", socket.user);
		UTIL.removerUserFromList(usuariosOnline, socket.user.id, socket.index);
		var user = {"id": socket.user.id}
		io.emit("removeUserFromListchat", JSON.stringify(user));
	});

	socket.on('start', function (data) { 
        var name = data.Name;
        var size = data.Size;
        var filePath = '/tmp';
        var position = 0;
        Files[name] = {
            fileSize: size,
            data: '',
            downloaded: 0,
            handler: null,
            filePath: filePath,
        };
        Files[name].getPercent = function () {
            return parseInt((this.downloaded / this.fileSize) * 100);
        };
        Files[name].getPosition = function () {
            return this.downloaded / 524288;
        };
        fs.open(Files[name].filePath, 'a', 0755, function (err, fd) {
            if (err)
                console.log('[start] error al abrir archivo: ' + err.toString());
            else {
                Files[name].handler = fd; // the file descriptor
                socket.emit('moreData', { 'position': position, 'percent': 0 });
            }
        });        
    });

    socket.on('upload', function (data) {
	    var name = data.Name;
	    var segment = data.Segment;

	    Files[name].downloaded += segment.length;
	    Files[name].data += segment;
	    if (Files[name].downloaded === Files[name].fileSize) {
	        fs.write(Files[name].handler, Files[name].data, null, 'Binary', 
	           function (err, written) {
	            //uploading completed
	            delete Files[name];
	            socket.emit('done', { file: file });
	        });
	    } else if (Files[name].data.length > 10485760) { //buffer >= 10MB
	        fs.write(Files[name].handler, Files[name].data, null, 'Binary', 
	           function (err, Writen) {
	            Files[name].data = ''; //reset the buffer
	            socket.emit('moreData', {
	                'position': Files[name].getPosition(),
	                'percent': Files[name].getPercent()
	            });
	        });
	    }
	    else {
	        socket.emit('moreData', {
	            'position': Files[name].getPosition(),
	            'percent': Files[name].getPercent()
	        });
	    }
	});

});

http.listen(3000, function(){
	console.log('listening on *:3000');
});