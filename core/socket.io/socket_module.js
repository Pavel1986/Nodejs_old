var async = require('async');

var connect = require('connect');
var cookie = require('cookie');
var ServerConfig = require('../config');
var CookieModule = require('../modules/cookies/session').CookieModel;

var ClearSocketSessions = function(){

    CookieModule.update( {} , {  SocketID : [] }, function(err, SessionsModified){

        console.log('Cleared : ' + SessionsModified);
    });

}
exports.ClearSocketSessions = ClearSocketSessions;

var GetCookieIDFromSocket = function(HandshakeData, callback){

    var cookieData = new Object();

    cookieData.Cookies = cookie.parse(HandshakeData.headers.cookie);
    cookieData.ParsedCookie = connect.utils.parseSignedCookies(cookieData.Cookies, ServerConfig.Cookie.Secret);
    var cookieID = cookieData.ParsedCookie[ServerConfig.Cookie.Key];


   callback(cookieID);

}
exports.GetCookieIDFromSocket = GetCookieIDFromSocket;

var CheckIsSocketIDinRoom = function(SocketID, RoomID, callback){

    var Room = Io.rooms["/" + RoomID];

    //Нет такой комнаты
    if(typeof Room === "undefined"){
        callback(false);
    }else{
        //Автор находиться в обсуждении
        if(Room.indexOf(SocketID) >= 0){
            callback(true);
        }else{
        //Его там нет
            callback(false);
        }
    }
}

var GetSocketsListByRoomID = function(RoomID, callback){

    //Находим список пользователей
    var SocketsList = Io.sockets.adapter.rooms[RoomID];
    var SocketsIDList = new Array();


    for (var SocketId in SocketsList) {
        SocketsIDList.push(Io.sockets.connected[SocketId].id);
    }

    callback(SocketsIDList);

}

exports.CheckIsSocketIDinRoom  = CheckIsSocketIDinRoom;
exports.GetSocketsListByRoomID = GetSocketsListByRoomID;
