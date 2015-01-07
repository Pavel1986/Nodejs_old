var mongoose = require('mongoose');
var Debates_Module = require('../../../core/modules/debates/debates');
var TopicModel = require('../../../core/modules/debates/debatesSchemes').DebateModels.Topic;
var MainModule = require('../../../core/modules/main/main');
var CookieModule = require('../../../core/modules/cookies/session.js');
var CookieSession = require('../../../core/modules/cookies/sessionSchemes').CookieModel;
var async = require('async');

module.exports = function(Component, Template, arRequest, TemplateModule, ComponentInitCallback) {

    async.waterfall([
        function(Component, Template, arRequest, TemplateModule, ComponentInitCallback, callback){
            //Подключаем служебные файлы (javascript, css)

            var ComponentResult = new Object();
            ComponentResult.DotParams = new Object();

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
            //Находим список свойств и их значений для созданий обсуждения (Категории, Кол-во участников, Время на ответ, Общее время)
            Debates_Module.GetProperty("Category", arRequest.InterfaceLanguage, function(arResult){
                arResult.Values.sort();
                ComponentResult.DotParams.Categories = arResult;
                callback(null, Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback);
            });

        },function(Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback, callback){
            //Настройка фильтра и навигационой цепочки


            //Определяем есть ли настройка фильтра
            if(typeof (arRequest.UserCookieSession.DebatesFilter) === "undefined"){
                //То создаём новую и определяем в ней значения по умолчанию

                var arNavParams = new Object();
                arNavParams.arFilter = new Object();
                arNavParams.arFilter.Language = arRequest.InterfaceLanguage;
                arNavParams.arSort = Debates_Module.DefaultTopicSort;
                arNavParams.Limit = Debates_Module.DefaultTopicsPerPage;
                arNavParams.Skip = 0; //Navigation page
            }else{

                arNavParams = arRequest.UserCookieSession.DebatesFilter;
                //Если есть переход на другую языковую сторону и она не совпадает с текущей настройкой
                if(arRequest.InterfaceLanguage !== arRequest.UserCookieSession.DebatesFilter.arFilter.Language){
                    arNavParams.Skip = 0;
                    arNavParams.arFilter.Language = arRequest.InterfaceLanguage;
                }

            }

            //Если есть запрос на изменение настройки
            if(arRequest.RequestParams.page > 0){
                arNavParams.Skip = arRequest.RequestParams.page * 10 - 10;
            }

            Debates_Module.GetTopicsCountByFilter(arNavParams.arFilter, function(PagesCount){

                arNavParams.PagesCount = PagesCount;
                ComponentResult.arNavParams = arNavParams;

                if(arRequest.UserCookieSession._id){

                    CookieSession.findByIdAndUpdate(arRequest.UserCookieSession._id,
                        { DebatesFilter :
                        {
                            arSort   : arNavParams.arSort,
                            arFilter : arNavParams.arFilter,
                            Limit    : arNavParams.Limit,
                            Skip     : arNavParams.Skip
                        }
                        },
                        function(err, doc){

                            if(err){ console.log("Error while updating session"); }

                            callback(null, Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback);
                        });

                }else{
                    callback(null, Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback);
                };
            });


            //Идея такова, что здесь обрабатываются запросы отправленные пользователем, если они есть.
            //Эти запросы объединяются с параметрами по умолчанию для получения обсуждений.

        }, function(Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback, callback){
            //Проверяем участвует ли пользователь в обсуждении, которые открыто или в процессе.


            Debates_Module.CheckIfMemberIsNotInTopics(arRequest.UserInfo._id, function(UserIsNotInTopics){

                if(UserIsNotInTopics){
                    ComponentResult.DotParams.UserIsNotInTopics = UserIsNotInTopics;
                }

                callback(null, Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback);

            });

        }, function(Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback){

            Debates_Module.GetTopicsList(ComponentResult.arNavParams, function(TopicList){

                ComponentResult.DotParams.arRequest = arRequest;
                ComponentResult.DotParams.TopicList = TopicList;
                ComponentResult.DotParams.arNavParams = ComponentResult.arNavParams;
                ComponentInitCallback(null, Component, Template, arRequest, TemplateModule, ComponentResult);
            });
        }
    ]);
};