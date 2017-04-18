var index = -1;

module.exports = {
    getIndex: function(usuario){
        return ++index;
    },
    removerUserFromList: function(usuariosOnline, id, index){
        for (var i = 0; i < usuariosOnline[id].length; i++) {
            if(usuariosOnline[id][i].index==index){
                usuariosOnline[id].splice(i, 1);
            }
        }
        if(usuariosOnline[id].length==0){
            delete usuariosOnline[id];
        }
    },
    mensaje: function(msg, user){
        var hoy = new Date().toISOString().slice(0, 19);
        if(user){
            console.log(hoy+" => "+msg+" ["+user.nombre+"]");
        }else{
            console.log(hoy+" => "+msg);
        }
    }
};