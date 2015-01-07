var async = require('async');
var User_M = require('./userSchemes').User_M;
var CookieSession = require('../cookies/session.js');
//var ServerConfig = require('../../config');

/*** Методы ***/

var FindUserBySessionID = function(SessionID, callback){

    CookieSession.FindCookieSessionByID(SessionID, function(UserSession){

        if(UserSession.authorized){

            FindUserByID(UserSession.UserID, function(User){

                if(User){
                    callback(User);
                }else{
                    callback(false);
                }

            });

        }else{
            callback(false);
        }



    });
}
exports.FindUserBySessionID = FindUserBySessionID;

var FindUserByID = function(UserID, callback){

    User_M.findOne( { "_id" : UserID }, {}, { lean : true}, function (err, arResult) {

        if (err) { console.log("Error: Error while finding user. Check syntax."); }

        if(arResult){

            arResult._id = arResult._id.toString();

            callback(arResult);

        }else{
            callback(false);
        }

    });
}
exports.FindUserByID = FindUserByID;


var SendUserInfoMessage = function(Socket, MessageType, MessageTitle, MessageContent){

    Socket.emit('UserInfoMessage', { 'MessageType' : MessageType, 'MessageTitle' : MessageTitle, 'MessageContent' : MessageContent});

}
exports.SendUserInfoMessage = SendUserInfoMessage;

var BroadcastInfoToAllInRoom = function(Room, Socket, MessageType, MessageTitle, MessageContent){

    Socket.broadcast.to(Room).emit('UserInfoMessage', { 'MessageType' : MessageType, 'MessageTitle' : MessageTitle, 'MessageContent' : MessageContent})

}
exports.BroadcastInfoToAllInRoom = BroadcastInfoToAllInRoom;

/* Методы для управления клиентской части */

var UserRedirect = function(Socket, Url){

    Socket.emit('UserRedirect', {'Url' : Url} );

}
exports.UserRedirect = UserRedirect;

/*** События ***/

exports.Registration = function(Io, Socket, RegData) {

    async.waterfall([
        function(Socket, RegData, callback){

            //Поиск существующего пользователя по почтовому адресу в базе
            User_M.findOne({
                Email: RegData.Email
            }, function(Socket, RegData, callback, Err, DuplicatedUser) {

                if (Err) {

                    console.log("Error reading clients list");
                    SendUserInfoMessage(Socket, "Error", "Registration error", "Technical error. Please, try again later.");

                    return;
                }

                if (DuplicatedUser) {

                    var MessagesArray = new Array("This email is already in use.", "This name is already in use.");

                    SendUserInfoMessage(Socket, "Warn", "Registration error", MessagesArray);

                    return;
                }

                // Сохраняем нового пользователя
                var User = new User_M();

                User.Datetime_created = new Date().getTime();
                User.Email = RegData.Email;
                User.Password = RegData.Password;
                User.Name = RegData.Name;
                User.DefaultInterfaceLanguage = "en";
                User.UserGroups.push("A");

                User.save(function(Socket, RegData, callback, err, NewUser){
                    NewUser = NewUser.toObject()
                    callback(null, RegData, NewUser, Socket);
                }.bind(null, Socket, RegData, callback));

            }.bind(null, Socket, RegData, callback));

        }.bind(null, Socket, RegData),
        function(RegData, User, Socket, callback){

            var UserID = User._id.toString();

            CookieSession.CookieModel.findOneAndUpdate( { _id : RegData.CookieID }, { authorized : true, UserID : UserID }, function(){
                callback(Socket);
            }.bind(null, Socket));

        }
    ], function (Socket) {

        //И перенаправляем его в профиль
        UserRedirect(Socket, "/personal/");

    });

}

exports.Login = function(Socket, AuthData) {

    //var Socket = Socket;
    //var AuthData = AuthData;

    async.waterfall([
        function(callback){

            console.log('Searching User');

            //Поиск существующего пользователя по почтовому адресу в базе
            User_M.findOne({ Email: AuthData.Email }, {}, { lean : true }, function(Err, UserFound) {

                if (Err) {

                    console.log("Error reading clients list");
                    SendUserInfoMessage(Socket, "Error", "Authorization error", "Technical error. Please, try again later.");

                }

                if(UserFound){
                //Если пользователь найден
                    if(AuthData.Password === UserFound.Password){

                        callback(null, UserFound);

                    }else{
                        SendUserInfoMessage(Socket, "Warn", "Authorization error", "Password is incorrect");
                    }

                }else{
                //Если нет такого пользователя
                    SendUserInfoMessage(Socket, "Warn", "Authorization error", "There is no such user or maybe your session is over. Reload page and try to login once again, please.");
                }


            });

        },
        function(UserFound, callback){

            CookieSession.CookieModel.findOneAndUpdate( { _id : Socket.CookieSessionID }, { authorized : true, UserID : UserFound._id.toString() }, function(){
                callback(Socket);
            });


            /*  Оставляю на тот случай, если сессия не будет находится!

            CookieSession.FindCookieSessionByID(AuthData.CookieID, function(UserFound, UserCookieSession){

                UserCookieSession.authorized = true;
                UserCookieSession.UserID = UserFound._id.toString();
                UserCookieSession.save(function(){
                    callback(Socket);
                });

            }.bind(null, UserFound));         */

        }
    ], function (Socket) {

        //И перенаправляем его в профиль
        UserRedirect(Socket, "/personal/");

    });

}

exports.Logout = function(Socket){

    async.waterfall([
        function(callback){

            CookieSession.CookieModel.findOneAndUpdate( { _id : Socket.CookieSessionID }, { authorized : false }, function(){
                callback(null);
            });

        }
    ], function () {

        //И перенаправляем его в профиль
        UserRedirect(Socket, "/");

    });
}