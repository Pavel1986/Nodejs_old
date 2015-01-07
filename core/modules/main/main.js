var async = require('async');
var Mongoose = require('mongoose');
var fs = require('fs');
var Dot = require('dot');
var ServerConfig = require('../../config');
var UserSystem_C = require('../user_system/user_system');
var CookieSession = require('../cookies/session.js');

/***** Методы и свойства главного модуля *****/
/*** Свойства ***/
//Определение локальной директории
//var RootDirectory = __dirname;
//var RootDirectory = process.cwd();
//exports.RootDirectory = RootDirectory;

var Application = new Object();
Application.Modules = new Object();

exports.Application = Application;

/*** Методы ***/

exports.IncludeComponent = function(Component, Template, arRequest, TemplateModule, IncludeComponentCallback){

    //Подключаем компонент
    async.waterfall([
        function(Component, Template, arRequest, TemplateModule, callback){
        //Подключаем component.js и формируем данные для шаблона

           var ComponentInit = require("../../components/" + Component + "/component.js");
           ComponentInit(Component, Template, arRequest, TemplateModule, callback);

        }.bind(null, Component, Template, arRequest, TemplateModule),

        function(Component, Template, arRequest, TemplateModule, ComponentResult, callback){
            //Получаем html-шаблон компонента с dot.js элементами

            ComponentResult.ComponentPath = "/core/components/" + Component
            ComponentResult.TemplatePath = ComponentResult.ComponentPath + "/views/" + Template;
            ComponentResult.DotParams.arRequest = arRequest;

            //Получаем html-шаблон компонента с dot.js элементами
            var template = fs.readFileSync(process.argv[1].replace(/\/[^\/]*$/, ComponentResult.TemplatePath  + "/template.html"));

            var templateFunction = Dot.template(template);
            var ComponentTemplate = templateFunction(ComponentResult.DotParams);

            callback(Component, Template, arRequest, TemplateModule, ComponentResult, ComponentTemplate);

        }
    ], function (err, Component, Template, arRequest, TemplateModule, ComponentResult, ComponentTemplate) {

            //Добавляем в Модуль шаблона результат инициализации компонента
            ComponentResult.ComponentTemplate = ComponentTemplate;
            TemplateModule.Components[Component] = ComponentResult;
            IncludeComponentCallback(null, arRequest, TemplateModule);

    }.bind(null, IncludeComponentCallback));

}

exports.GetHeaderCSSJS = function(Components){

    var HeaderCSSJS = new Object();

    HeaderCSSJS.HeaderCSS = new Array();
    HeaderCSSJS.HeaderJS = new Array();

    async.forEach(Object.keys(Components), function (ComponentItem, callback){

        var Component = Components[ComponentItem];

        if(Component.arCSS !== undefined){

        var CSSPath = Component.TemplatePath + "/public/css/";

        async.forEach(Component.arCSS, function (CSSPath, CSSitem, callback){

            HeaderCSSJS.HeaderCSS.push(CSSPath + CSSitem);

            callback();

        }.bind(null, CSSPath));
        }

        if(Component.arJS !== undefined){

            var JSPath = Component.TemplatePath + "/public/javascripts/";

        async.forEach(Component.arJS, function (JSPath, JSitem, callback){

            HeaderCSSJS.HeaderJS.push(JSPath + JSitem);

            callback();

        }.bind(null, JSPath));
        }

        callback();

    });

    return HeaderCSSJS;
}

exports.ProcessRequest = function(Req, Res, callbackRender){

  async.waterfall([
        function(callback){
            //Находим данные о пользователе из сессии;



            CookieSession.FindCookieSessionByID(Req.session.id, function(UserCookieSession){

                var arRequest = new Object();
                arRequest.RequestParams = Req.query;
                arRequest.UserInfo = new Object();
                arRequest.LanguageDirectory = new String();

                //Значения по умолчанию
                arRequest.InterfaceLanguage = Req.session.InterfaceLanguage;
                arRequest.LanguageDirectory = Req.session.LanguageDirectory;
                arRequest.Authorized = false;
                arRequest.UserInfo.UserGroups = new Array("N");


                if(UserCookieSession != null){

                    arRequest.UserCookieSession = UserCookieSession;
                    //Для авторизованных пользователей
                    if(UserCookieSession.authorized){
                        arRequest.Authorized = true;

                        //Находим группы пользователя
                        UserSystem_C.FindUserByID(UserCookieSession.UserID, function(arRequest, callback, FoundUser){
                            if(FoundUser){

                                arRequest.UserInfo = FoundUser;

                                callback(null, arRequest);
                            }
                        }.bind(null, arRequest, callback));

                    }else{
                        callback(null, arRequest);
                    }
                }else{

                    callback(null, arRequest);

                }
            });


        },
        function(arRequest, callback){
        //Заводим статистику о пользователе

            //Req.connection.remoteAddress;

            //Req.header('Referer');

            callback(null, arRequest);
        }

    ], function (err, arRequest) {
        if(!err){
            callbackRender(arRequest);

        }
    });
}

exports.IncludeComponentLangFiles = function(Component, Template, Language, Componentcallback){


            var LanguageMessages = require("../../components/" + Component + "/views/" + Template + "/messages.json");
            var CMessages = new Object();

            async.forEach(Object.keys(LanguageMessages), function (LanguageMessages, Language, Item, callback){

                CMessages[Item] = LanguageMessages[Item][Language];

                callback();

            }.bind(null, LanguageMessages, Language));

            Componentcallback(CMessages);

}

exports.ParseDateTime = function(Datetime, callback){

    arResult = new Object();
    arResult.Year = Datetime.getFullYear();
    arResult.Month = Datetime.getMonth();
    arResult.WeekDay = Datetime.getDay();
    arResult.Date = Datetime.getDate();

    arResult.Hours = Datetime.getHours();
    arResult.Minutes = Datetime.getMinutes();
    arResult.Seconds = Datetime.getSeconds();

    callback(arResult);
}

var HasArrayUniqueValue = function(UniqueValue, SearchArray, callback){

    var count = 0;
    //Поиск уникального максимального значения
    async.each(SearchArray, function (Value, callback) {

        if(Value === UniqueValue){
            count++;
        }

        callback();

    }, function (err) {
        if(count > 1){
            callback(false);
        }else{
            callback(true);
        }
    });
}
exports.HasArrayUniqueValue = HasArrayUniqueValue;

var GetObjectValuesArray =  function(ReicevedObject, callback){

    var ObjectPropertiesKeys = Object.keys(ReicevedObject);

    var ObjectValuesArray = new Array();
    //Для каждого элемента
    async.each(ObjectPropertiesKeys, function (Key, callback) {

        ObjectValuesArray.push(ReicevedObject[Key]);
        callback();

    }, function (err) {
        callback(ObjectValuesArray);
    });
}
exports. GetObjectValuesArray = GetObjectValuesArray;

var ReturnLanguagePath = function(LanguageID, callback){

    var LanguagePath = '';
    if(LanguageID != ServerConfig.Template.DefaultLanguage){

        LanguagePath = '/' + LanguageID;

    }

    callback(LanguagePath);

}
exports.ReturnLanguagePath = ReturnLanguagePath;