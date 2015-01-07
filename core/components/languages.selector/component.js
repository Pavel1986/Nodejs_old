var ServerConfig = require('../../config');

module.exports = function(Component, Template, arRequest, TemplateModule, ComponentInitCallback) {

            var ComponentResult = new Object();
            ComponentResult.DotParams = new Object();

            var arCSS = new Array();
            arCSS.push("style.css");
            ComponentResult.arCSS = arCSS;

            var arJS = new Array();
            arJS.push("client_controller.js");
            ComponentResult.arJS = arJS;

            ComponentResult.DotParams.InterfaceLanguages = ServerConfig.Template.InterfaceLanguages;
            ComponentResult.DotParams.DefaultLanguage = ServerConfig.Template.DefaultLanguage;

            ComponentInitCallback(null, Component, Template, arRequest, TemplateModule, ComponentResult);

}

