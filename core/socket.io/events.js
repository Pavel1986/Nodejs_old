var   Http = require('http')
    , Path = require('path')
    , async = require('async')
    , url = require('url')
    ,cookie = require('cookie')
    , SocketModule = require('./socket_module');

//Для соединения к БД без авторизации
// Параметры соединения mongodb://пользователь;пароль@ip/база данных
//var Mongoose = require('mongoose').connect('mongodb://debates:debates782615@127.0.0.1/debates');

//Подключаем модули ядра
var UserSystem_C = require('../modules/user_system/user_system')
  , DebatesModule = require('../modules/debates/debates')
  , CookieModule = require('../modules/cookies/session')
  , CookieModel = require('../modules/cookies/sessionSchemes').CookieModel;

Io.use(function(Socket, next) {
    //Задача авторизации найти CookieID и добавить к сокету
    //Если прислана кука в заголовках запроса

    var HandshakeData = Socket.request;

    if(HandshakeData.headers.cookie){
        //Получаем CookieID
        SocketModule.GetCookieIDFromSocket(HandshakeData, function(CookieID){
            console.log("CookieID : " + CookieID);
            CookieModel.findOne({ _id: CookieID }, function(Err, RecordFound) {
                //Если запись найдена
                if(RecordFound){

                    //TODO Сделать проверку, сколько установленных сокет соединений, если > 3 или 5, прервть содениние

                    //Разрешить авторизацию сокета
                    next();

                }else{
                     //TODO проверять https://github.com/LearnBoost/socket.io/issues/545
                     // Не приняли запрос на отображение пользовательского текста ошибки на стороне клиента

                    //Если не найдена кука в базе данных
                    console.log("Cookie is not found in database");
                    next(new Error());

                }
            });

        });

    }else{
        //Если нет куки в запросе от клиента, то отобразить чтобы была включена поддержка cookies
        console.log("Not found cookie in headers request")
        next(new Error());
    }

});

Io.on('connection', function (Socket) {

    console.log("Socket ID : " + Socket.id);

    SocketModule.GetCookieIDFromSocket(Socket.handshake, function(CookieID){

        Socket.CookieSessionID = CookieID;

        ParsedURL = url.parse(Socket.handshake.headers.referer, true);

        async.waterfall([
            function (callback) {

                //Получаем данные о пользователе и добавляем в сокет
                if(typeof(Socket.CookieSessionID) !== "undefined"){

                    UserSystem_C.FindUserBySessionID(Socket.CookieSessionID, function(CookieSession){

                        if(CookieSession){

                            Socket.User = CookieSession;

                        }

                        callback(null, null);

                    });

                }

            },
            function (arResult, callback) {

                    callback(null, null);

            }

        ], function (Error, arResult) {

            CookieModule.UpdateCookieSessionByID(Socket.CookieSessionID, {$push: {"SocketID":  Socket.id }}, function(CookieSession) {
                Socket.CookieSession = CookieSession;
            });
        });

    });

    Socket.on('StopTimer', function() {

        console.log(DebatesModule.TimersStopIdList);
        clearTimeout(DebatesModule.TimersStopIdList[Socket.TopicID]);

    });

    Socket.on('disconnect', function() {

        CookieModule.UpdateCookieSessionByID(Socket.CookieSessionID, {$pull: {"SocketID":  Socket.id }}, function(CookieSession) {
            Socket.CookieSession = CookieSession;
        });

        if(typeof(Socket.TopicID) != "undefined"){

            Socket.leave(Socket.TopicID);
                                     /*
            SocketModule.GetUsersListByRoomID(Socket.TopicID, function(UsersList){

                //То, что будем отправлять

                var VisitorsData = new Array();

                async.each(UsersList, function (User, callback) {

                    var VisitorData = new Object();

                    VisitorData.id = User._id;
                    VisitorData.name = User.Name;
                    VisitorsData.push(VisitorData);

                    callback();

                }, function (err) {

                    Io.sockets.in(Socket.TopicID).emit('VisitorsList', VisitorsData );

                });

            });
                */
        }
    });

    //Событие "Авторизация пользователя"
    Socket.on('Authorization', function (AuthData) {

        //Авторизуем пользователя
        UserSystem_C.Login(Socket, AuthData);

    });

    //Событие "Регистрация пользователя"
    Socket.on('Registration', function (RegData) {

        RegData.CookieID = SocketInfo.cookieID;
        RegResult = UserSystem_C.Registration(Io, Socket, RegData);

        //Возвращаем результат
        Socket.emit('registration_result', { Result: RegResult });

    });

    Socket.on('Logout', function () {

        UserSystem_C.Logout(Io, Socket);

    });

    /********* Debates *********/

    Socket.on('CreateTopic', function (arParams){

        DebatesModule.CreateTopic(arParams, Socket);
    });

    //Событие при добавлении участника в обсуждение
    Socket.on('JoinTopic', function (arParams) {

        var arResult = new Object();
        var MessageContent = new Array();

        async.waterfall([
            function(callback){
                //Проверка авторизации пользователя

                if(Socket.CookieSession.authorized){
                    callback(null, arResult);
                }else{
                    MessageContent.push("You need to be authorized to join the topic.");
                    callback(true, MessageContent);
                }
            },
            function(arResult, callback){
                //Проверка, что пользователь не является уже участиком или автором другого обсуждения

                DebatesModule.CheckIfMemberIsNotInTopics(Socket.CookieSession.UserID, function(UserIsNotInTopics){

                    if(UserIsNotInTopics){
                        callback(null, arResult);
                    }else{
                        MessageContent.push("You cannot join topic while you are communicating in other topic.");
                        callback(true, MessageContent);
                    }

                });

            },
            function(arResult, callback){
                //Проверяем, что обсуждение существует, проверяем статус "Opened", добавляемся и меняем статус на "Processing"

                if(typeof (Socket.TopicID) === "undefined"){
                    MessageContent.push("Before join the topic, you must be in topic detail page.");
                    callback(true, MessageContent);
                }

                DebatesModule.GetTopicByID(Socket.TopicID, function(Topic){

                    if(Topic != false){

                        arResult.Topic = Topic;

                    }

                    if(Topic.Status_code === "Opened" && Topic.Members.indexOf(Socket.CookieSession.UserID) === -1){

                        Topic.Members.push(Socket.CookieSession.UserID);

                        var Start_Time = new Date();
                        var Temp_Time = new Date();
                        arResult.Set_Time = Topic.Debates_max_time * 60 * 1000;

                        //console.log('Starting timer at : ' + Start_Time.toTimeString());


                        //Преобразовываем текущее время в линукс формат и прибавляем время обсуждения
                        var Temp_time_ux = Temp_Time.getTime() + arResult.Set_Time;
                        //console.log("~Stopping timer at : " + new Date(Temp_time_ux));
                        DebatesModule.UpdateTopicByID(Socket.TopicID, { Members : Topic.Members, Status_code: "Processing", Datetime_started : Start_Time.getTime(), Datetime_temp_closing_ux : Temp_time_ux  }, function(Updated){

                            if(!Updated){
                                console.log("Error while updating Topic. Joining member.");
                                MessageContent.push("Sorry, we have technical errors.");
                                callback(true, MessageContent);
                            }
                            //Io.sockets.in(Socket.TopicID).emit('UserInterfaceEffects', { "Hide" : { "#JoinTopic" : "scale" } } );

                            callback(null, arResult);

                        });
                    }
                });

            }, function(arResult, callback){

                DebatesModule.TimersStopIdList[Socket.TopicID] = setTimeout(function(){

                    DebatesModule.CloseTopicByID(Socket.TopicID, function(Updated){
                        if(Updated){
                            Io.sockets.in(Socket.TopicID).emit('UserRedirect', {'Url' : Socket.CookieSession.ParsedSession.LanguageDirectory + '/detail/?ID=' + Socket.TopicID } );
                        }

                        //console.log('Stopping timer at : ' + new Date().toTimeString());
                    });

                }, arResult.Set_Time);

            }

        ], function (Error, arResult) {

            if(!Error){


                //Надо отправить участникам обсуждения, кроме автора
                CookieModule.FindCookieSessionByUserID(arResult.Topic.AuthorID, function(User){

                    SocketModule.CheckIsSocketIDinRoom(User.SocketID, Socket.TopicID, function(AuthorIsInTopic){

                        if(AuthorIsInTopic){
                            Io.sockets.in(Socket.TopicID).emit('UserRedirect',  {'Url' : Socket.CookieSession.ParsedSession.LanguageDirectory + '/detail/?ID=' + Socket.TopicID });
                        }else{
                            Io.sockets.in(Socket.TopicID).except(User.SocketID).emit('UserRedirect',  {'Url' : Socket.CookieSession.ParsedSession.LanguageDirectory + '/detail/?ID=' + Socket.TopicID });
                            var InfoMessage = 'Your debate has been started. <a href="' + Socket.CookieSession.ParsedSession.LanguageDirectory + '/detail/?ID=' + Socket.TopicID +  '">Please, click here to go to your topic.</a>';
                            Io.sockets.socket(User.SocketID).emit('UserInfoMessage', { 'MessageType' : 'Info', 'MessageTitle' : 'Debates', 'MessageContent' : InfoMessage});
                        }

                    });

                });

            }else{

                UserSystem_C.SendUserInfoMessage(Socket, "Warn", "Window title", arResult);
            }
        });
    });

    //Событие при добавление участника в Сокет-комнату
    Socket.on('JoinSocketRoom', function () {

        console.log(Socket.TopicID);

        Socket.TopicID = 'WWW';

        console.log('works');

         console.log('-----');

         var TopicID = 'TopicID';
         //  GetSocketsListByRoomID
         Socket.join(TopicID);

         console.log('-----');

         var clients = Io.sockets.adapter.rooms[TopicID];

         //console.log(clients);
         console.log('Type of clients : ' + typeof(clients));


         for (var clientId in clients) {
             //console.log(Io.sockets.connected[clientId]);
             console.log("Client ID : " + clientId);
         }



     });

    Socket.on('VoteForMember', function(arParams){

        var MemberID = arParams.UserID;

        var RatingModule = require('../modules/rating/rating.js');
        var arResult = new Object();
        var MessageContent = new Array();

        async.waterfall([
            function (callback) {
                //Проверяем, что пользователь авторизован
                if(Socket.CookieSession.authorized){
                    callback(null, arResult);
                }else{
                    MessageContent.push("You need to be authorized to vote for the member.");
                    callback(true, MessageContent);
                }
            },function (arResult, callback) {
                //Проверяем, что обсуждение существует и находится в статусе "Processing"

                if(typeof (Socket.TopicID) === "undefined"){
                    MessageContent.push("Before join the topic, you must be in topic detail page.");
                    callback(true, MessageContent);
                }

                DebatesModule.GetTopicByID(Socket.TopicID, function(Topic){
                    if(Topic != false){ arResult.Topic = Topic; }
                    if(Topic.Status_code === "Processing"){
                        callback(null, arResult);
                    }else{
                        MessageContent.push("Topic must be in 'Processing' status.");
                        callback(true, MessageContent);
                    }
                });
            },function(arResult, callback){
                //Проверяем, тот кто голосует, не является ли участником обсуждения
                DebatesModule.CheckIfMemberIsInTopic(Socket.CookieSession.UserID, Socket.TopicID, function(FoundUser){
                    if(FoundUser === true){
                        MessageContent.push("Member of topic cannot vote.");
                        callback(true, MessageContent);
                    }else{
                        callback(null, arResult);
                    }
                });
            },function (arResult, callback) {
                //Проверяем, что пользователь раньше не голосовал за выбранного участника
                RatingModule.UpdateVoteForMember(Socket.TopicID, MemberID, Socket.CookieSession.UserID, function(Result){
                    callback(null, arResult);

                });
            },
            function (arResult, callback) {
                //Собираем кол-во голосовом участников
                DebatesModule.GetTopicMembersByTopicID(Socket.TopicID, function(Members){

                    var MembersCounter = new Object();
                    async.each(Members, function(Member, callback){
                        MembersCounter[Member._id] = Member.VotesCount;
                        callback();
                    }, function(Err){

                        if(!Err){
                            arResult.MembersCounter = MembersCounter;
                            callback(null, arResult);
                        }else{
                            console.log("Error while forming MembersCounter.");
                            callback(true, arResult);
                        }
                    });

                });
            }
        ], function (Error, MessageContent) {

            if (!Error) {

                //Отправляем всем данные голосования и отображаем общие голоса
                Io.sockets.in(Socket.TopicID).emit('VoteForMember', arResult.MembersCounter);
            } else {
                console.log('Eror while voting for member');
                //UserSystem_C.SendUserInfoMessage(Socket, "Warn", "Window title", MessageContent);
            }
        });
    });

    Socket.on('GetTopicRemainingTime', function () {

        DebatesModule.GetTopicByID(Socket.TopicID, function(Topic){
            if(Topic.Status_code === "Processing"){

                var UxTimeLeft = Topic.Datetime_temp_closing_ux - new Date().getTime();
                if(UxTimeLeft > 0){
                    Socket.emit('GetTopicRemainingTime', { UxTime : UxTimeLeft });
                }
            }
        });

    });

    Socket.on('Destroy', function (Data) {

        console.log('Destroy!');

    });

    Socket.on('Send', function (Data) {

        console.log("Client message reiceved!");

        //DebatesModule.IsMemberInTopic();

        var MessageContent = new Array();
        var arResult = new Object();
        var arParams = new Object();
        arParams.TopicID = Socket.TopicID;
        arParams.Language = Socket.CookieSession.ParsedSession.InterfaceLanguage;
        arParams.SocketID = Socket.id;
        arParams.CookieSessionID = Socket.CookieSessionID;
        arParams.MessageData = Data;

        async.waterfall([
            function(callback){
                //Получаем данные об обсуждении

                DebatesModule.GetTopicByID(arParams.TopicID, function(Topic){

                    if(Topic !== false){
                        arResult.Topic = Topic;

                        callback(null, arResult);
                    }else{
                        MessageContent.push("Sorry, we have technical errors.");
                        callback(true, MessageContent);
                    }

                });

            },
            function(arResult, callback){
                //Проверяем, что обсуждение в статусе Processing
                if(arResult.Topic.Status_code !== "Processing"){
                    MessageContent.push("Topic status must be in Processing status.");
                    callback(true, MessageContent);
                }


                if(!Socket.CookieSession.authorized){
                    MessageContent.push("You must be authorized");
                    callback(true, MessageContent);
                }

                DebatesModule.CheckIfMemberIsInTopic(Socket.CookieSession.UserID ,arParams.TopicID, function(IsMember){
                    if(IsMember){

                        callback(null, arResult);

                    }else{

                        MessageContent.push("User is not member.");
                        callback(true, MessageContent);
                    }
                });
            },
            function(arResult, callback){
                //Сохраняем сообщение

                DebatesModule.SaveMessage( arParams, function(err, doc){
                    if(err){
                        console.log('Error while saving topic message');
                    }

                    callback(null, arResult);

                });


            }

        ], function (Err, arResult) {
            //Отправляем ответ

            if(!Err){
                Io.sockets.in(Socket.TopicID).emit('Message', arParams.MessageData.Message);

            }else{
                console.log('Main async error while saving topic message');
                UserSystem_C.SendUserInfoMessage(Socket, "Warn", "Window title", arResult);
            }


        });

    });
});