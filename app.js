//Подключение модулей проекта
var Express = require('express')
    , Http = require('http')
    , Path = require('path')
    , Dot = require('dot')
    , async = require('async')
    , mime = require('mime')
    , url = require('url')
    , connectDomain = require('connect-domain');


var cookie = require('cookie');
var	MongoStore = require('./core/modules/cookies/sessionStore')(Express);
//Для соединения к БД без авторизации
//var Mongoose = require('mongoose').connect('mongodb://localhost/debates');
// Параметры соединения mongodb://пользователь;пароль@ip/база данных
var Mongoose = require('mongoose').connect('mongodb://debates:debates782615@127.0.0.1/debates');

//Подключаем модули ядра
var MainCore = require('./core/modules/main/main'),
    ServerConfig = require('./core/config'),
    UserSystem_C = require('./core/modules/user_system/user_system'),
    DebatesModule = require('./core/modules/debates/debates'),
    CookieSession = require('./core/modules/cookies/session.js'),
    SocketModule = require('./core/socket.io/socket_module.js');

var App = Express();

App.configure(function(){
    App.set('port', ServerConfig.Main.ServerPort);
    App.use(connectDomain());   // Подключаем обработчик ошибок
   /* App.use(function(err, Req, Res, next) {

        console.log('woow');

        MainCore.ProcessRequest(Req, Res, function(arRequest){

            console.log('ww');

            Res.render('./' + arRequest.InterfaceLanguage + '/error.html', {
                arRequest : arRequest,
                // arRequest : null,
                title : " Error",
                layout : false
            });
        });

    });         */
//  App.use(Express.logger('dev')); // Время генерации страницы
    //App.use(Express.compress());
    //Шаблонизация
    App.set('view engine', Dot);
    App.enable('view cache');
    App.set('views', __dirname + '/views');
    App.engine('.html', require('express-dot').__express);
    App.use(Express.favicon());
    App.use(Express.bodyParser());
    App.use(Express.methodOverride());
    //Куки
    App.use(Express.cookieParser(ServerConfig.Cookie.Secret));

    App.use(Express.session({
            secret: ServerConfig.Cookie.Secret,
            key: ServerConfig.Cookie.Key,
            store: new MongoStore( ServerConfig.Cookie.DbOptions ),
            cookie: { maxAge: ServerConfig.Cookie.MaxAge, secure: false}
    }));

    App.use(require('stylus').middleware(__dirname + '/public'));
    App.use(Express.static(__dirname + '/public', { maxAge: 86400000 }));
    //Стили
    App.use(Express.static(Path.join(__dirname, 'public')));
});

/*App.configure('development', function(){
    App.use(Express.errorHandler());
});                                   */

App.all('*', function(Req, Res, next) {

    var StepNext = false;
    var StaticMimesTypes = ['text/css','application/javascript','image/gif', 'image/jpeg', 'image/pjpeg', 'image/vnd.wap.wbmp', 'image/tiff'];
    var RequestMimeType = mime.lookup(Req.url);

    for (var i = 0; i < StaticMimesTypes.length; i++) {
        MimeType = StaticMimesTypes[i];
        if(MimeType === RequestMimeType){
            StepNext = true;
        }
    }

    //Запрос статики
    if(StepNext){
        next();
    }else{

    /* Определяем выбранный язык на основании директории в запросе */
    var InterfaceLanguage = ServerConfig.Template.DefaultLanguage;

    for (var LanguageKey in ServerConfig.Template.InterfaceLanguages) {
        LanguageID = ServerConfig.Template.InterfaceLanguages[LanguageKey];

        //Производим определения языка в запросе URL
        var RegularExpression = new RegExp('^\/' + LanguageID + '\/', 'i');
        if(RegularExpression.exec(Req.originalUrl) !== null){
          InterfaceLanguage = LanguageID;
            Req.url = Req.url.replace(RegularExpression, "/");
        }
    }

    /**************************************************************/

    Req.session.InterfaceLanguage = InterfaceLanguage;

    //Определяем языковую директорию
    if(InterfaceLanguage != ServerConfig.Template.DefaultLanguage){
        Req.session.LanguageDirectory = "/" + InterfaceLanguage;
    }else{
        Req.session.LanguageDirectory = "";
    }

    next();
    }
});

App.get('/', function(Req, Res){

    //Задача : Определять язык пользователя
    /*
     Если пользователь меняет язык: авторизованному делается запись в таблице users, неавторизованному, делаем запись в куке. Время сессии должно быть не меньше, чем максимальное время обсуждения темы.

     */

    MainCore.ProcessRequest(Req, Res, function(arRequest){

        //Определение объектов общих компонентов
        var TemplateModule = new Object();
        TemplateModule.Components = new Object();

        async.waterfall([
            //Подключаем компоненты
            function(callback){

                MainCore.IncludeComponent("elements.list", "default", arRequest, TemplateModule, callback);

            },
            function(arRequest, TemplateModule, callback){

                MainCore.IncludeComponent("authorization", "default", arRequest, TemplateModule, callback);

            },
            function(arRequest, TemplateModule, callback){

                MainCore.IncludeComponent("languages.selector", "default", arRequest, TemplateModule, callback);

            },
            //Получаем JS и CSS для размещения в html-заголовок
            function(arRequest, TemplateModule, callback){

                var HeaderCSSJS = MainCore.GetHeaderCSSJS(TemplateModule.Components);
                callback(null, arRequest, TemplateModule, HeaderCSSJS);
            }
        ],
            //Отображаем шаблон для пользователя
            function (err, arRequest, TemplateModule, HeaderCSSJS) {
            if(!err){

                Res.render('./' + arRequest.InterfaceLanguage + '/index.html', {
                    arRequest : arRequest,
                    title : "Index",
                    layout : "/" + arRequest.InterfaceLanguage + "/layout.html",
                    HeaderCSS : HeaderCSSJS.HeaderCSS,
                    HeaderJS : HeaderCSSJS.HeaderJS,
                    TAuth : TemplateModule.Components["authorization"].ComponentTemplate,
                    TElementsList : TemplateModule.Components["elements.list"].ComponentTemplate,
                    LanguageSelector : TemplateModule.Components["languages.selector"].ComponentTemplate

                });

            }
        });
    });
});

App.get('/detail/', function(Req, Res){

    MainCore.ProcessRequest(Req, Res, function(arRequest){

        //Определение объектов общих компонентов
        var TemplateModule = new Object();
        TemplateModule.Components = new Object();

        async.waterfall([
            //Подключаем компоненты
            function(callback){
                MainCore.IncludeComponent("elements.detail", "default", arRequest, TemplateModule, callback);
            },
            function(arRequest, TemplateModule, callback){

                MainCore.IncludeComponent("authorization", "default", arRequest, TemplateModule, callback);

            },
            function(arRequest, TemplateModule, callback){

                MainCore.IncludeComponent("languages.selector", "default", arRequest, TemplateModule, callback);

            },
            //Получаем JS и CSS для размещения в html-заголовок
            function(arRequest, TemplateModule, callback){
                var HeaderCSSJS = MainCore.GetHeaderCSSJS(TemplateModule.Components);
                callback(null, arRequest, TemplateModule, HeaderCSSJS);
            }
        ],
            //Отображаем шаблон для пользователя
            function (err, arRequest, TemplateModule, HeaderCSSJS) {
                if(!err){
                    Res.render('./' + arRequest.InterfaceLanguage + '/detail.html', {
                        arRequest : arRequest,
                        title : "Debates",
                        layout : "/" + arRequest.InterfaceLanguage + "/layout.html",
                        HeaderCSS : HeaderCSSJS.HeaderCSS,
                        HeaderJS : HeaderCSSJS.HeaderJS,
                        TElementsDetail : TemplateModule.Components["elements.detail"].ComponentTemplate,
                        TAuth : TemplateModule.Components["authorization"].ComponentTemplate,
                        LanguageSelector : TemplateModule.Components["languages.selector"].ComponentTemplate
                    });
                }
            });
    });
});

App.get('/personal/', function(Req, Res){

    MainCore.ProcessRequest(Req, Res, function(arRequest){

        //Определение объектов общих компонентов
        var TemplateModule = new Object();
        TemplateModule.Components = new Object();


        async.waterfall([
            //Подключаем компоненты
            function(callback){
                MainCore.IncludeComponent("authorization", "default", arRequest, TemplateModule, callback);
            },
            function(arRequest, TemplateModule, callback){

                MainCore.IncludeComponent("languages.selector", "default", arRequest, TemplateModule, callback);

            },
            //Получаем JS и CSS для размещения в html-заголовок
            function(arRequest, TemplateModule, callback){
                var HeaderCSSJS = MainCore.GetHeaderCSSJS(TemplateModule.Components);
                callback(null, arRequest, TemplateModule, HeaderCSSJS);
            }
        ],
            //Отображаем шаблон для пользователя
            function (err, arRequest, TemplateModule, HeaderCSSJS) {

                if(!err){
                    Res.render('./' + arRequest.InterfaceLanguage + '/personal.html', {
                        arRequest : arRequest,
                        title : "Personal",
                        layout : "/" + arRequest.InterfaceLanguage + "/layout.html",
                        HeaderCSS : HeaderCSSJS.HeaderCSS,
                        HeaderJS : HeaderCSSJS.HeaderJS,
                        TAuth : TemplateModule.Components["authorization"].ComponentTemplate,
                        LanguageSelector : TemplateModule.Components["languages.selector"].ComponentTemplate
                    });
                }
            });
    });
});

App.get('/info/', function(Req, Res){

    MainCore.ProcessRequest(Req, Res, function(arRequest){

        //Определение объектов общих компонентов
        var TemplateModule = new Object();
        TemplateModule.Components = new Object();

        async.waterfall([
            //Подключаем компоненты
            function(callback){
                MainCore.IncludeComponent("authorization", "default", arRequest, TemplateModule, callback);
            },
            function(arRequest, TemplateModule, callback){

                MainCore.IncludeComponent("languages.selector", "default", arRequest, TemplateModule, callback);

            },
            //Получаем JS и CSS для размещения в html-заголовок
            function(arRequest, TemplateModule, callback){
                var HeaderCSSJS = MainCore.GetHeaderCSSJS(TemplateModule.Components);
                callback(null, arRequest, TemplateModule, HeaderCSSJS);
            }
        ],
            //Отображаем шаблон для пользователя
            function (err, arRequest, TemplateModule, HeaderCSSJS) {

                if(!err){
                    Res.render('./' + arRequest.InterfaceLanguage + '/info.html', {
                        arRequest : arRequest,
                        title : "Personal",
                        layout : "/" + arRequest.InterfaceLanguage + "/layout.html",
                        HeaderCSS : HeaderCSSJS.HeaderCSS,
                        HeaderJS : HeaderCSSJS.HeaderJS,
                        TAuth : TemplateModule.Components["authorization"].ComponentTemplate,
                        LanguageSelector : TemplateModule.Components["languages.selector"].ComponentTemplate
                    });
                }
            });
    });
});

App.get('/socket/', function(Req, Res){

    MainCore.ProcessRequest(Req, Res, function(arRequest){

        //Определение объектов общих компонентов
        var TemplateModule = new Object();
        TemplateModule.Components = new Object();

        async.waterfall([
            //Подключаем компоненты
            function(callback){
                MainCore.IncludeComponent("authorization", "default", arRequest, TemplateModule, callback);
            },
            function(arRequest, TemplateModule, callback){

                MainCore.IncludeComponent("languages.selector", "default", arRequest, TemplateModule, callback);

            },
            //Получаем JS и CSS для размещения в html-заголовок
            function(arRequest, TemplateModule, callback){
                var HeaderCSSJS = MainCore.GetHeaderCSSJS(TemplateModule.Components);
                callback(null, arRequest, TemplateModule, HeaderCSSJS);
            }
        ],
            //Отображаем шаблон для пользователя
            function (err, arRequest, TemplateModule, HeaderCSSJS) {

                if(!err){
                    Res.render('./' + arRequest.InterfaceLanguage + '/socket.html', {
                        arRequest : arRequest,
                        title : "Personal",
                        layout : "/" + arRequest.InterfaceLanguage + "/layout.html",
                        HeaderCSS : HeaderCSSJS.HeaderCSS,
                        HeaderJS : HeaderCSSJS.HeaderJS,
                        TAuth : TemplateModule.Components["authorization"].ComponentTemplate,
                        LanguageSelector : TemplateModule.Components["languages.selector"].ComponentTemplate
                    });
                }
            });
    });
});

/* Администрированый раздел */
App.get('/vault/', function(Req, Res){

    DebatesModule.CheckTopicsInProcessAndClose();

    MainCore.ProcessRequest(Req, Res, function(arRequest){

        //Определение объектов общих компонентов
        var TemplateModule = new Object();
        TemplateModule.Components = new Object();

        async.waterfall([
            //Подключаем компоненты
            function(callback){
                MainCore.IncludeComponent("authorization", "default", arRequest, TemplateModule, callback);
            },
            //Получаем JS и CSS для размещения в html-заголовок
            function(arRequest, TemplateModule, callback){
                var HeaderCSSJS = MainCore.GetHeaderCSSJS(TemplateModule.Components);
                callback(null, arRequest, TemplateModule, HeaderCSSJS);
            }
        ],
            //Отображаем шаблон для пользователя
            function (err, arRequest, TemplateModule, HeaderCSSJS) {
                if(!err){
                    Res.render('./' + arRequest.InterfaceLanguage + '/vault.html', {
                        arRequest : arRequest,
                        title : "Vault",
                        layout : false,
                        HeaderCSS : HeaderCSSJS.HeaderCSS,
                        HeaderJS : HeaderCSSJS.HeaderJS,
                        TAuth : TemplateModule.Components["authorization"].ComponentTemplate
                    });
                }
            });

    });

});

App.get('/images/*', function(Req, Res){
    Res.sendfile(__dirname + '/public' + Req.url);
});

App.get('/stylesheets/*', function(Req, Res){
    Res.contentType("text/css");
    Res.sendfile(__dirname + '/public' + Req.url);
});

App.get('/javascripts/*', function(Req, Res){
    Res.contentType("text/javascript");
    Res.sendfile(__dirname + '/public' + Req.url);
});

App.get('/core/components/*.css', function(Req, Res){
    Res.contentType("text/css");
    Res.sendfile(__dirname + Req.url);
});

App.get('/core/components/*.js', function(Req, Res){
    Res.contentType("text/javascript");
    Res.sendfile(__dirname + Req.url);
});

App.get('*', function(Req, Res){

    MainCore.ProcessRequest(Req, Res, function(arRequest){

        /* TODO : Вернуть статус 404 + сделать запись в статистику */

        Res.render('./' + arRequest.InterfaceLanguage + '/404.html', {
            arRequest : arRequest,
            title : "404 Error",
            layout : false
        });
    });
});

//Обработка ошибок
App.use(function(err, Req, Res, next) {

    console.log('Testing error!');

    MainCore.ProcessRequest(Req, Res, function(arRequest){

        console.log("!! System error at : " + Req.url);
        console.log(err.message);

        Res.render('./' + arRequest.InterfaceLanguage + '/error.html', {
            arRequest : arRequest,
            title : "Error",
            layout : false
        });
    });

});

Server = Http.createServer(App)
    , Io = require('socket.io').listen(Server, {
    /* Io options */
});

Server.listen(App.get('port'), function(){
    console.log('Server started at : ' + new Date() + ' on port :' + App.get('port'));

//    DebatesModule.CheckTopicsInProcessAndClose();

//    SocketModule.ClearSocketSessions();
});

/* Подключаем Socket.io события, настройки соединения и авторизации */
require('./core/socket.io/events');

