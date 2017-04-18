//var sqlite3 = require('sqlite3').verbose();
//var db = new sqlite3.Database(':memory:');
//var db = new sqlite3.Database('ww');
//
var mysql = require('mysql');
//var connection = mysql.createConnection({
var pool  = mysql.createPool({
    connectionLimit : 100,
    host            : '192.168.3.10',
    user            : 'sistema',
    password        : '275718',
    database        :'ww',
    debug           : false
});
//connection.connect();

var DB = {};

//DB.createTable = function(){
	//db.run("DROP TABLE IF EXISTS clientes");
	//db.run("CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, estado INTEGER)");
    //db.run("CREATE TABLE IF NOT EXISTS usuarios (id INTEGER, nombre TEXT, estado INTEGER)");
    //db.run("DROP TABLE IF EXISTS mensajes");
	//db.run("CREATE TABLE IF NOT EXISTS mensajes (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha_hora TEXT, origen_id INTEGER, destino_id INTEGER, mensaje TEXT, visto INTEGER)");
	//console.log("La tabla usuarios ha sido correctamente creada");
//}

/*DB.insertUser = function(user){
	var stmt = db.prepare("INSERT INTO usuarios VALUES (?,?,?)");
	stmt.run(user.id, user.nombre, user.estado);
	stmt.finalize();
}*/

DB.getAllUser = function(id, cb){
	/*db.all("SELECT id, nombre, estado FROM usuarios", function(err, rows) {
		if(cb) cb(rows);
	});

    pool.query("SELECT iusu_id AS id, CONCAT(vusu_nom, ' ', vusu_ape) AS nombre, estado FROM usuario", function(err, rows) {
        if(cb) cb(rows);
    });*/
    pool.getConnection(function(err, connection) {
        //connection.query("SELECT iusu_id AS id, CONCAT(vusu_nom, ' ', vusu_ape) AS nombre, estado FROM usuario WHERE iusu_id != ? ORDER BY vusu_nom, vusu_ape", id, function(err, rows) {
        connection.query("SELECT U.iusu_id AS id, CONCAT(U.vusu_nom, ' ', U.vusu_ape) AS nombre, null AS estado, \
                            (SELECT COUNT(*) FROM chat_mensajes WHERE de_id=U.iusu_id AND para_id = ? AND visto='N') AS count \
                            FROM usuario U WHERE U.iusu_id != ? AND U.activo  = 'S' GROUP BY U.orden, U.vusu_nom, U.vusu_ape", [id, id], function(err, rows) {
            connection.release();
            if(cb) cb(rows);
        });
    });
}

DB.getUser = function(id, cb){
	/*stmt = db.prepare("SELECT * FROM usuarios WHERE id = ?");
    stmt.bind(id); 
    stmt.get(function(error, row){
    	if (cb) cb(row);
    });*/
    pool.getConnection(function(err, connection) {
        connection.query("SELECT iusu_id AS id, CONCAT(vusu_nom, ' ', vusu_ape) AS nombre, estado FROM usuario WHERE iusu_id = ?", id, function(err, rows) {
            connection.release();
            if(cb) cb(rows);
        });
    });
}

function changeStatus(id, status, cb){
    pool.getConnection(function(err, connection) {
        connection.query("UPDATE usuario SET estado = ? WHERE iusu_id = ?", [status, id], function(err, rows) {
            connection.release();
            if(cb) cb(rows);
        });
    });
}

DB.online = function(id, cb){
	//db.run("UPDATE usuarios SET estado = 1 WHERE id = $id", {$id: id});
    changeStatus(id, 1, cb);
}

DB.offline = function(id, cb){
	//db.run("UPDATE usuarios SET estado = 0 WHERE id = $id", {$id: id});
    changeStatus(id, 0, cb);
}

DB.saveMessage = function(row, cb){
    pool.getConnection(function(err, connection) {
        connection.query('INSERT INTO chat_mensajes SET ?', row, function(err, result) {
            connection.release();
            if(cb) cb(result.insertId);
        });
    });
}

DB.updateMessageView = function(id){
    pool.getConnection(function(err, connection) {
        connection.query("UPDATE chat_mensajes SET visto = 1 WHERE id = ?", id, function(){
            connection.release();
        });
    });
}

DB.getMessageNoViewCount =  function(id){
    pool.getConnection(function(err, connection) {
        connection.query("SELECT de_id, COUNT(*) AS count FROM chat_mensajes WHERE para_id = ? AND visto='N' GROUP BY de_id", id, function(err, rows) {
            connection.release();
        });
    });
}

DB.getMessagesFromUser =  function(de_id, para_id, cb){
    pool.getConnection(function(err, connection) {
        if(err){
            console.log("error 1");
        }
        connection.query("SELECT IF(DATE(CM.fechahora)=CURDATE(), \
                                    DATE_FORMAT(CM.fechahora, 'Hoy a las %h:%i %p'), \
                                    DATE_FORMAT(CM.fechahora, '%d-%m-%Y %h:%i %p')) AS fechahora, \
                                CM.mensaje, CM.de_id, CONCAT(U.vusu_nom, ' ', U.vusu_ape) AS nombre_para \
                                FROM chat_mensajes CM INNER JOIN usuario U ON U.iusu_id=CM.de_id \
                                WHERE (DATE(CM.fechahora) = CURDATE()) AND \
                                ((CM.de_id = ? AND CM.para_id = ?) OR (CM.de_id = ? AND CM.para_id = ?))", [de_id, para_id, para_id, de_id], function(err, rows) {
            if(err){
                console.log("error 2");
            }
            connection.query("UPDATE chat_mensajes SET visto = 1 \
                WHERE (de_id = ? AND para_id = ?) OR (de_id = ? AND para_id = ?)", [de_id, para_id, para_id, de_id], function(err, rows){
                if(err) throw err;
                connection.release();
            });
            if(cb) cb(rows);
        });
    });
}

module.exports = DB;