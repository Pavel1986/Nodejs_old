var async = require('async');
var mongoose = require('mongoose');
var Debates_Module = require(process.cwd() + '/core/modules/debates/debates');

module.exports = function(arRequest, Template) {

    var ComponentResult = new Object();

    var arCSS = new Array();
    arCSS.push("style.css");
    ComponentResult.arCSS = arCSS;

    var arJS = new Array();
    arJS.push("socket.io.js");
    arJS.push("main.js");
    ComponentResult.arJS = arJS;

    var arResult = new Object();

    arResult.Lang = "ru";
    ComponentResult.DotParams = arResult;



    Debates_Module.GetProperty("", function(arProperties){
        arResult.Properties = arProperties;
    });

    ComponentResult.Properties = arResult;

    return ComponentResult;

}