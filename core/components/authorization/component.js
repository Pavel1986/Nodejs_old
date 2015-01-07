var async = require('async');
var MainModule = require('../../modules/main/main');

module.exports = function(Component, Template, arRequest, TemplateModule, ComponentInitCallback) {

    async.waterfall([
        function(Component, Template, arRequest, TemplateModule, ComponentInitCallback, callback){

            var ComponentResult = new Object();
            ComponentResult.DotParams = new Object();

            var arCSS = new Array();
            arCSS.push("style.css");
            ComponentResult.arCSS = arCSS;

            MainModule.IncludeComponentLangFiles(Component, Template, arRequest.InterfaceLanguage, function(LanguageFiles){

                ComponentResult.DotParams.CMessages = LanguageFiles;

                callback(null, Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback);
            })


        }.bind(null, Component, Template, arRequest, TemplateModule, ComponentInitCallback),
        function(Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback, callback){

            callback(null, Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback);

        },function(Component, Template, arRequest, TemplateModule, ComponentResult, ComponentInitCallback){

            ComponentResult.DotParams.arUser = arRequest.UserInfo;

            ComponentInitCallback(null, Component, Template, arRequest, TemplateModule, ComponentResult);

        }
     ]);

}

