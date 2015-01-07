var Express = require('express')
    , Http = require('http' )
    , Path = require('path')
    , fs = require('fs')
    , Dot = require('dot')
    , async = require('async');

var App = Express();

App.configure(function(){
    App.set('port', 3000);
//  App.use(Express.logger('dev')); // Время генерации страницы
    App.use(Express.compress());
    //Шаблонизация
    App.set('view engine', Dot);
    App.enable('view cache');
    App.set('views', __dirname + '/views');
    App.engine('.html', require('express-dot').__express);
    App.use(Express.favicon());
    App.use(Express.bodyParser());
    App.use(Express.methodOverride());

    //Стили
    App.use(require('stylus').middleware(__dirname + '/public'));
    App.use(Express.static(__dirname + '/public'));
    App.use(Express.static(Path.join(__dirname, 'public')));

});

App.configure('development', function(){
    //App.use(Express.errorHandler());
});

Server = Http.createServer(App);

Server.listen(App.get('port'), function(){
    console.log("Server listening on port " + App.get('port'));
});


var TimersStopIdList = new Object();

TimersStopIdList['sakdjkasj3311'] = 123456;
TimersStopIdList['sakdjkasj3322'] = 123456;
TimersStopIdList['sakdjkasj3333'] = 123456;
TimersStopIdList['sakdjkasj3344'] = 123456;




console.log(TimersStopIdList);

delete(TimersStopIdList['sakdjkasj3344']);

console.log(TimersStopIdList);

//TimersStopIdList = TimersStopIdList.remove('sakdjkasj3322');

