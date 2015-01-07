var Mongoose = require('mongoose');
var async = require('async');

/* Получение схем для mongoose моделей */
var PropertyModel = require('./debatesSchemes').DebateModels.Properties;
var PropertiesValues = require('./debatesSchemes').DebateModels.PropertiesValues;
var TopicModel = require('./debatesSchemes').DebateModels.Topic;
var TopicMessagesModel = require('./debatesSchemes').DebateModels.TopicMessages;
var UserSystem_C = require('../user_system/user_system');
var CookieSession = require('../cookies/session.js');
var MainModule = require('../main/main.js');
var Application = MainModule.Application;
var RatingModule = require('../rating/rating.js');

/*** Свойства ***/
var TimersStopIdList = new Object();
var DefaultTopicsPerPage = 10;
var DefaultTopicSort = { Datetime_created : -1 };
var DefaultAutoCloseOpenedTopics = 30 * 1000; //В одной секунде 1000 миллисекунд
var DefaultMax_Time = 100;


/*** Методы ***/

//Получаем список обсуждений из базы данных
var GetTopicsList = function (arNavParams, callback){

    TopicModel.find( arNavParams.arFilter, 'id', { lean : true, sort : arNavParams.arSort, limit : arNavParams.Limit, skip : arNavParams.Skip }, function(err, TopicsList){

        var arResult = new Array();

        async.forEach(TopicsList, function (Topic, AsyncCallback){

            GetTopicByID(Topic._id , function(FoundTopic){
                arResult.push(FoundTopic);
                AsyncCallback();
            });

        }, function (err) {
            callback(arResult);
        });

    });


};

var GetTopicByID = function (TopicID, callback){

    TopicModel.findById(  TopicID , {}, { lean: true }, function (err, Topic) {

        if(err){
            console.log('Error while getting topic by id.');
        }

        if(Topic){

            async.waterfall([
                function(callback){
                    //Получаем победителя, если он есть
                    if(typeof (Topic.WinnerID) !== "undefined" && Topic.WinnerID.length > 0){

                        UserSystem_C.FindUserByID(Topic.WinnerID, function(User){
                            if(User){
                                Topic.Winner = User;
                            }
                            callback(null, Topic);
                        });
                    }else{
                        callback(null, Topic);
                    }

                },
                function (Topic, callback) {
                    //Находим автора обсуждения
                    UserSystem_C.FindUserByID(Topic.AuthorID, function(Author){

                        Topic.Author = Author;
                        callback(null, Topic);
                    });

                },
                function (Topic, callback) {
                    //Получаем категорию обсуждения
                    GetProperyValue(Topic.Category, function(CategoryValue){

                        Topic.Category = CategoryValue;

                        callback(null, Topic);

                    })
                }

            ], function (Error, Topic) {

                    callback(Topic);

            });

        }else{
            callback(false);
        }
    });
};

var UpdateTopicByID = function (TopicID, arRequest, callback){

    TopicModel.findByIdAndUpdate(TopicID, arRequest, function(err){

        console.log(err);

        if(!err){
            callback(true);
        }else{
            callback(false);
        }
    });
};

var CheckIfMemberIsNotInTopics = function(UserID, callback){

    TopicModel.find( { $or : [ { Status_code : "Opened" }, { Status_code : "Processing" } ], Members : UserID }, { lean : true}, function(err, doc){
        if(err){
            console.log("Error while checking member in topics.");
        }

        if(doc.length > 0){
            callback(false);
        }else{
            callback(true);
        }
    })
}

var CheckIfMemberIsInTopic = function(UserID, TopicID, callback){

    GetTopicByID(TopicID, function(Topic){

        if(Topic){

            if(Topic.Members.indexOf(UserID) >= 0){
                callback(true);
            }else{
                callback(false);
            }

        }else{
            console.log('Error while finding topic. CheckIfMemberIsInTopic function.');
        }

    });

};

var GetTopicMembersByTopicID = function(TopicID, callback){

    GetTopicByID(TopicID, function(Topic){
        if(Topic){

            var Members = new Array();

            async.each(Topic.Members, function(UserID, callback){
                UserSystem_C.FindUserByID(UserID, function(User){
                    if(User){


                        RatingModule.GetMemberVotesCountByID(TopicID, UserID, function(VotesCount){

                            User.VotesCount = VotesCount;
                            Members.push(User);

                            callback();
                        });
                    }
                });
            }, function(Err){
                if(!Err){
                    callback(Members);
                }else{
                    console.log("Error while getting topic members.");
                }
            });

        }
    });




};

var GetMessagesByTopicID = function(TopicID, callback){

    TopicMessagesModel.find({ TopicID : TopicID }, null, { lean : true, sort : { Datetime_created : -1 } }, function(err, TopicMessages){

        callback(TopicMessages);

    })


};

var SaveMessage = function (arParams, callback){

    console.log('Saving message');

    var NewMessage = TopicMessagesModel();
    //NewMessage.UserID =
    NewMessage.TopicID = arParams.TopicID;
    NewMessage.Datetime_created = new Date().getTime();
    NewMessage.Language = arParams.Language;  //Изменить
    NewMessage.Message = arParams.MessageData.Message;
    NewMessage.Rank = 0;
    NewMessage.save();

    callback();

};

var GetTopicsCountByFilter = function(arFilter, callback){

    TopicModel.count(arFilter, function (err, count) {

        var PagesCount = Math.ceil(count/10);

        callback(PagesCount);


   });

};

//Метод создания обсуждения
var CreateTopic = function(arParams, Socket){

    var MessageContent = new Array();

    async.waterfall([
        function(arParams, Socket, callback){

            //Получение данных пользователя из Cookie сессии
            CookieSession.FindCookieSessionByID(Socket.CookieSessionID, function(Socket, arParams, callback, UserCookieSession){

                //Проверка авторизован ли пользователь
                if(typeof(UserCookieSession.authorized) === "undefined"){
                    MessageContent.push("You must authorize before creating topic.");
                    callback(true, Socket, MessageContent);
                }

                //Получение информации о пользователе
                UserSystem_C.FindUserByID(UserCookieSession.UserID, function(Socket, arParams, UserCookieSession, callback, arUser){
                    callback(null, Socket, arParams, UserCookieSession, arUser);
                }.bind(null, Socket, arParams, UserCookieSession, callback));

            }.bind(null, Socket, arParams, callback));

        }.bind(null, arParams, Socket),
        function(Socket, arParams, UserCookieSession, arUser, callback){

            CheckIfMemberIsNotInTopics(arUser._id, function(UserIsNotInTopics){

                if(UserIsNotInTopics){
                    callback(null, Socket, arParams, UserCookieSession, arUser);
                }else{
                    MessageContent.push("You cannot create topic while you are communicating in other topic.");
                    callback(true, Socket, MessageContent);
                }

            })

        },
        function(Socket, arParams, UserCookieSession, arUser, callback){

            var Check_result = true;
            //var MessageContent = new Array();

            //Проверка входных данных
            if(arParams.TopicName.length < 12){
                MessageContent.push("Topic name length must be more than 12 symbols.");
                Check_result = false;
            }
            if(arParams.TopicDesc < 20){
                MessageContent.push("Description length must be more than 20 symbols.");
                Check_result = false;
            }

            //Проверка на существование выбранной категории пользователем в БД
            if(arParams.TopicCategory.length > 0){
                PropertiesValues.findOne( { _id : arParams.TopicCategory }, function (Socket, MessageContent, arParams, arUser, callback, err, CategoryFound) {

                    if(err){
                        console.log(err);
                    }
                    //Если категорию введёную пользователем не находим
                    if(!CategoryFound){
                        Check_result = false;
                        MessageContent.push("There is no topic category, please, check category.");
                    }

                    //Проверяем результат проверки
                    if(Check_result){
                        callback(null, Socket, arParams, UserCookieSession, arUser);
                    }else{
                        callback(true, Socket, MessageContent);
                    }
                }.bind(null, Socket, MessageContent, arParams, arUser, callback));
            }
        },
        function(Socket, arParams, UserCookieSession, arUser, callback){

            //Создание обсуждения в базе данных

            var NewTopic = new TopicModel();

            NewTopic.Datetime_created = new Date().getTime();
            NewTopic.AuthorID = arUser._id;
            NewTopic.Language = UserCookieSession.ParsedSession.InterfaceLanguage;
            NewTopic.Title = arParams.TopicName,
            NewTopic.Description = arParams.TopicDesc,
            NewTopic.Status_code = "Opened",   //Property code
            NewTopic.Category = arParams.TopicCategory,    //Property id
            NewTopic.Members.push(arUser._id);
            NewTopic.Debates_max_time = DefaultMax_Time;
//            Newtopic.Answer_time = ; //Надо завести свойства
//            Newtopic.Max_members_quantity = ; //Надо завести свойства
            NewTopic.Views = 0;
            NewTopic.Rank = 0;

            NewTopic.save(function(err, Topic){
                if(err){
                    console.log('Error while saving topicID.' + Topic._id);
                }

                Socket.TopicLanguage = NewTopic.Language;
                Socket.TopicID = Topic._id;
                callback(null, Socket, arParams, UserCookieSession, arUser);

            });
        },
        function(Socket, arParams, UserCookieSession, arUser, callback){

            //Запускаем автозакрытие
            TimersStopIdList[Socket.TopicID] = setTimeout(function(){

                //Если время истякло, удаляем обсуждение
                TopicModel.findByIdAndRemove(Socket.TopicID, function(){

                    //Удаляем счётчик
                    delete(TimersStopIdList[Socket.TopicID]);

                   // Io.sockets.in(Socket.TopicID).emit('UserRedirect',  {'Url' : Socket.CookieSession.ParsedSession.LanguageDirectory + '/' });
                   // Socket.emit('UserInfoMessage', { 'MessageType' : 'Info', 'MessageTitle' : 'Topic', 'MessageContent' : 'Your topic was autoclosed, because nobody has joined.'});
                    Io.sockets.in(Socket.TopicID).emit('UserInfoMessage', { 'MessageType' : 'Info', 'MessageTitle' : 'Topic', 'MessageContent' : 'Topic was autoclosed, because nobody has joined.'});

                });

            }, DefaultAutoCloseOpenedTopics);

                callback(null, Socket, null);

        }

    ], function (err, Socket, MessageContent) {

        if(!err){
            //Перенаправляем его в детальный просмотр обсуждения (будет что-то похожее на /category/id/)
            MainModule.ReturnLanguagePath(Socket.TopicLanguage, function(LanguagePath){
                UserSystem_C.UserRedirect(Socket, LanguagePath + "/detail/?ID=" + Socket.TopicID);
            })

        }else{

            UserSystem_C.SendUserInfoMessage(Socket, "Warn", "Topic creation error", MessageContent);
        }


    });


};

//Поиск по одному свойству
var GetProperty = function(Code, Language, callback){

    var arFilter = {};

    //Проверяем входные данные
    if (typeof Code === undefined || typeof Code !== "string"){
            console.log("function GetProperty : Code must be requested and it must be a string");
            callback(false);
        }
        arFilter.Code = Code;

    if (typeof Language === undefined || typeof Language !== "string"){
        console.log("function GetProperty : Language must be requested and it must be a string");
        callback(false);
        }
        arFilter.Language = Language;

    //Находим свойство по коду
    PropertyModel.findOne(arFilter, {},{ lean : true }, function (err, Property) {

        PropertiesValues.find({ CategoryId : Property._id,Language : Property.Language }, function(Property, err, PropertyValues){

            Property.Values = new Array();
            //Для каждого варианта значения категории
            async.each(PropertyValues, function(PropertyValue, callback){

                var Value = new Object();
                Value.Name = PropertyValue.Value;
                Value._id = PropertyValue._id;

                Property.Values.push(Value);

            }, function(err){
                console.log("function GetProperty: Error saving values");
            });

            callback(Property);

        }.bind(null, Property));

    });
};

var GetProperyValue = function(PropertyValueID, callback){

    PropertiesValues.findById( PropertyValueID, null, { lean : true }, function(err, PropertyValue){

        if(err){
            console.log('Erorr while finding property value: ' + PropertyValueID );
            callback(false);
        }else{
            callback(PropertyValue);
        }

    });

};

//Метод проверяет нет ли прерванных обсуждений (который в статусе Processing), если у таких закончилось время он их закрывает, если не закончилось, то возобновляется счётчик
var CheckTopicsInProcessAndClose = function(){

    console.log('*** Starting to find and update lost topics...');

    var arResult = new Object();
    var ClosedTopics = 0;
    var RestoredTopics = 0;

    async.waterfall([
        function (callback) {
            //Получение обсуждений со статусом "Processing"

            TopicModel.find( { Status_code : "Processing" }, "Datetime_started Datetime_temp_closing_ux Language" , { lean : true }, function(Err, TopicsList){

                arResult.ProcessingTopicsCount = TopicsList.length;

                //console.log('There are : ' + arResult.ProcessingTopicsCount);

                if(arResult.ProcessingTopicsCount > 0){
                    arResult.TopicsList = TopicsList;
                    callback(null, arResult);
                }else{
                    console.log('*** There are no topics in "Processing" status.');
                    callback(true, arResult);
                }
            });

        },
        function (arResult, callback) {



            //Для каждого обсуждения проверяем закончилось ли его время или нет
            async.each(arResult.TopicsList, function(Topic, callback){

                var CurrentTime = new Date().getTime();
                var TopicLanguage = Topic.Language;

                var Timeleft = (Topic.Datetime_temp_closing_ux / 1000) - (CurrentTime / 1000);
                //Делаем запас во времени для загрузки самого сервера
                if(Timeleft > 5){

                    console.log('There are ' + Timeleft + " seconds left. Trying to start timer...");

                    //Запускаем timer для обсуждения

                    async.waterfall([
                        function (callback) {

                            arResult.TimerID  = setTimeout(function(){

                                CloseTopicByID(Topic._id, function(Updated){
                                    if(Updated){
                                        RestoredTopics++;

                                        MainModule.ReturnLanguagePath(Topic.Language, function(LanguagePath){

                                            Io.sockets.in(Topic._id).emit('UserRedirect', {'Url' : LanguagePath + '/detail/?ID=' + Topic._id } );
                                        });
                                    }

                                    //console.log('Stopping timer at : ' + new Date().toTimeString());
                                });

                            }, Timeleft * 1000);

                            callback(null, arResult);

                        }

                    ], function (Error, arResult) {

                        TimersStopIdList[Topic._id] = arResult.TimerID;

                        callback();

                    });


                }else{
                    //Если не осталось времени закрываем обсуждение
                    CloseTopicByID(Topic._id, function(Updated){

                        if(Updated){
                            ClosedTopics++;
                            /*TODO Добавить языковую директорию перед ссылкой */
                            MainModule.ReturnLanguagePath(Topic.Language, function(LanguagePath){
                                Io.sockets.in(Topic._id).emit('UserRedirect', {'Url' : LanguagePath + '/detail/?ID=' + Topic._id } );
                            });

                        }
                        callback();
                    });
                }

            }, function(err){
                if(err){
                    console.log("Error while adding values");
                }

                callback(null, arResult);

            });

        }
    ], function (Error, arResult) {

        if (Error) {

           if(arResult.ProcessingTopicsCount > 0){
                console.log('Error while checking processing topics');
           }
        }
        if(ClosedTopics > 0){
            console.log("Closed topics : " + ClosedTopics);
        }
        if(RestoredTopics){
            console.log("Restored topics : " + RestoredTopics);
        }

        console.log('*** Done restoring topics.');



    });

}

var CloseTopicByID = function(TopicID, callback){

    var Error = false;
    var arResult = new Object();
    arResult.TopicID = TopicID;

    async.waterfall([
        function (callback) {

            //Получаем Topic из БД
            GetTopicByID(arResult.TopicID, function(TopicFound){

                if(TopicFound){
                    arResult.Topic = TopicFound;
                    callback(null, arResult);
                }else{
                    console.log('Error finding topic');
                    callback(true, arResult);
                }
            });
        },
        function (arResult, callback) {

            RatingModule.GetMembersVotesCountByID(arResult.TopicID, function(MembersVotes){
                if(!MembersVotes){

                    callback(true, arResult);
                }else{
                    arResult.MembersVotes = MembersVotes;
                    callback(null, arResult);
                }

            });

        },
        function (arResult, callback) {
            //Распределяем игроков по категориям очков
            RatingModule.GetMembersStructure(arResult.MembersVotes, function(MembersStructure){
                arResult.MembersStructure = MembersStructure;
                callback(null, arResult);
            });
        },
        function (arResult, callback) {
            //Раздаём баллы
                RatingModule.UpdateMembersPoints(arResult.MembersStructure.Structure, function(Updated){
                    if(!Updated){
                        console.log('Error while updating members points');
                        callback(true, arResult);
                    }else{
                        callback(null, arResult)
                    }

                });
        }

    ], function (Error, arResult) {

        if (!Error) {

            var arFields = { Status_code : "Closed", Datetime_closed : new Date().getTime() };

            if(arResult.MembersStructure.Structure.Winner.length > 0){
                arFields.WinnerID = arResult.MembersStructure.Structure.Winner;
            }

            UpdateTopicByID(arResult.TopicID, arFields, function(Updated){
                callback(Updated);

             });

        } else {

            console.log('Error while closing topic ' + arResult.TopicID);
            callback(false);
        }
    });


}

module.exports = {
    TimersStopIdList             : TimersStopIdList,
    CloseTopicByID               : CloseTopicByID,
    CheckTopicsInProcessAndClose : CheckTopicsInProcessAndClose,
    GetTopicsList                : GetTopicsList,
    GetTopicByID                 : GetTopicByID,
    UpdateTopicByID              : UpdateTopicByID,
    CheckIfMemberIsNotInTopics   : CheckIfMemberIsNotInTopics,
    CheckIfMemberIsInTopic       : CheckIfMemberIsInTopic,
    GetTopicMembersByTopicID     : GetTopicMembersByTopicID,
    GetMessagesByTopicID         : GetMessagesByTopicID,
    SaveMessage                  : SaveMessage,
    GetTopicsCountByFilter       : GetTopicsCountByFilter,
    CreateTopic                  : CreateTopic,
    GetProperty                  : GetProperty,
    DefaultTopicsPerPage         : DefaultTopicsPerPage,
    DefaultTopicSort             : DefaultTopicSort
}