/***** Конфигурационный файл, где определяются настройки сервера *****/

/***  Конфигурация сервера  ***/
//Режим работы сервера (разработка или рабочий)
//process.env.NODE_ENV = 'production';
process.env.NODE_ENV = 'development';

/***  Главный модуль  ***/
var MainModule = new Object();

//Порт сервера
MainModule.ServerPort = 3000;

/*** Шаблон ***/
var TemplateModule = new Object();
TemplateModule.DefaultLanguage = "en";
TemplateModule.InterfaceLanguages = new Array("en", "ru");

/***  Cookies  ***/
var CookieModule = new Object();
//Конфиг подключения к сессиям в БД
CookieModule.DbOptions = {
        db: 		'debates',
        host: 		'localhost',
        port: 		27017,
        username: 	'sessions',
        password:	'sessions782615',
        collection: 'sessions',
		auto_reconnect: true,
		clear_interval: 15
};

CookieModule.SetMaxAge = function(minutes){
	minutes = 60000 * minutes;
return minutes;
}

//Определение жизни cookie в минутах
CookieModule.MaxAge = CookieModule.SetMaxAge(120);
CookieModule.Secret = '34r34rsd43tgfy56hyju76788ikjhn';
CookieModule.Key    = 'deb_sess';

exports.Main = MainModule;
exports.Template = TemplateModule;
exports.Cookie = CookieModule;

