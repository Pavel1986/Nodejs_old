var mongoose = require('mongoose');
var MainModule = require('../../../core/modules/main/main');
var Debates_Module = require('../../../core/modules/debates/debates');
var Rating_Module = require('../../../core/modules/rating/rating');
var SocketModule = require('../../../core/socket.io/socket_module');
var async = require('async');

module.exports = function(Component, Template, arRequest, TemplateModule, ComponentInitCallback) {

    async.waterfall([
        function(Component, Template, arRequest, TemplateModule, ComponentInitCallback, callback){
            //Подключаем служебные файлы (javascript, css)

            var ComponentResult = new Object();
            ComponentResult.DotParams = new Object();
            ComponentResult.DotParams.Component = new Object();
            ComponentResult.DotParams.Component.ComponentTemplatePath = '/core/components/' + Component + '/views/' + Template + '/';

            var arCSS = new Array();
            arCSS.push("style.css");
            ComponentResult.arCSS = arCSS;

            var arJS = new Array();
            arJS.push("client_controller.js");
            ComponentResult.arJS = arJS;

            MainModule.IncludeComponentLangFiles(Component, Template, arRequest.InterfaceLanguage, function(LanguageFiles){

                ComponentResult.DotParams.CMessages = LanguageFiles;

                callback(null, Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback);
            })

        }.bind(null, Component, Template, arRequest, TemplateModule, ComponentInitCallback),
        function(Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback, callback){

            Debates_Module.GetTopicByID(arRequest.RequestParams.ID, function(Topic){

                ComponentResult.DotParams.Topic = Topic;

                callback(null, Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback);

            });

        },function(Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback, callback){

            Debates_Module.GetTopicMembersByTopicID(arRequest.RequestParams.ID, function(Members){

                async.each(Members, function(Member, callback){

                    Rating_Module.HasUserVotedForTopicMember(arRequest.RequestParams.ID, Member._id, arRequest.UserInfo._id, function(VoteFound){
                        Member.CurrentUserVotedForThisMember = VoteFound;
                        callback();
                    });

                }, function(Err){
                    if(!Err){
                        ComponentResult.DotParams.TopicMembers = Members;
                        callback(null, Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback);
                    }else{
                        console.log("Error while getting topic members.");
                    }
                });


            });

        },function(Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback, callback){
            //Проверяем участвует ли пользователь в обсуждении, которые открыто или в процессе.

            Debates_Module.CheckIfMemberIsNotInTopics(arRequest.UserInfo._id, function(UserIsNotInTopics){

                ComponentResult.DotParams.UserIsNotInTopics = UserIsNotInTopics;

                callback(null, Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback);

            });

        },function(Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback, callback){
            //Проверяем является ли пользователем участником обсуждения

            Debates_Module.CheckIfMemberIsInTopic(arRequest.UserInfo._id, arRequest.RequestParams.ID, function(UserIsTopicMember){


                ComponentResult.DotParams.UserIsTopicMember = UserIsTopicMember;
                callback(null, Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback);

            });

        },function(Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback, callback){

            //Если обсуждение закрыто получаем результат обсуждения
            if(ComponentResult.DotParams.Topic.Status_code == "Closed"){

                Rating_Module.GetMembersVotesCountByID(arRequest.RequestParams.ID, function(MembersVotes){
                    if(!MembersVotes){

                        callback(null, Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback);

                    }else{

                        Rating_Module.GetMembersStructure(MembersVotes, function(MembersStructure){
                            ComponentResult.DotParams.Topic.MembersStructure = MembersStructure;

                            callback(null, Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback);
                        });
                    }

                });

            }else{
                callback(null, Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback);
            }

        }
    ],function(Err, Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback){

        ComponentResult.DotParams.arRequest = arRequest;

        Debates_Module.GetMessagesByTopicID(arRequest.RequestParams.ID, function(TopicMessages){

            ComponentResult.DotParams.TopicMessages = TopicMessages;

            ComponentInitCallback(null, Component, Template, arRequest, TemplateModule, ComponentResult);
        });

    });

}