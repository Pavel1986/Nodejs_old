var Express = require('express')
    , Http = require('http' )
    , Path = require('path')
    , fs = require('fs')
    , Dot = require('dot')
    , async = require('async');

var Mongoose = require('mongoose').connect('mongodb://localhost/debates');
var ObjectId = Mongoose.Types.ObjectId;

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
    App.use(Express.errorHandler());
});

App.get('/', function(Req, Res){

  /*  //Categories
    var DebateCategoriesSchema = new Mongoose.Schema({

        Categories : {
            _id: { type : String },
            Name : {},
            Values : {}
        }
    }, { collection : "debates" });

    var DebateCategoriesModel = Mongoose.model("Categories", DebateCategoriesSchema);



    var Categories = new DebateCategoriesModel({
        Categories: { //Код
            Name : { ru : "Категория", lv : "Kategorija", en : "Category" },
            Values : [
                { _id : new ObjectId, NAME : { ru : "Спорт", lv : "Sports", en : "Sport" } },
                { _id : new ObjectId, NAME : { ru : "Здоровье", lv : "Veselība", en : "Health" } },
                { _id : new ObjectId, NAME : { ru : "Работа", lv : "Darbs", en : "Work" } },
                { _id : new ObjectId, NAME : { ru : "Семья", lv : "Ģimene", en : "Family" } },
                { _id : new ObjectId, NAME : { ru : "Животные", lv : "Dzivnieki", en : "Animals" } }
            ]}});

    Categories.save();


    /* MembersQty
    var DebateMembersQtySchema = new Mongoose.Schema({

        MembersQuantity : {
            _id: { type : String },
            Name : {},
            Values : []
        }
    }, { collection : "debates" });

    var DebateMembersQtyModel = Mongoose.model("MembersQty", DebateMembersQtySchema);



    var DebateMembers = new DebateMembersQtyModel({
        MembersQuantity: { //Код
            Name : { ru : "Количество участников", lv : "Lietotājus skaits", en : "Members quantity" },
            Values : [ 2, 3 ]
            }});

    DebateMembers.save();


    // AnswerTime
    var DebateAnswerTimeSchema = new Mongoose.Schema({

        AnswerTime : {
            _id: { type : String },
            Name : {},
            Values : []
        }
    }, { collection : "debates" });

    var DebateAnswerTimeModel = Mongoose.model("AnswerTime", DebateAnswerTimeSchema);



    var DebateAnswerTime = new DebateAnswerTimeModel({
        AnswerTime: { //Код
            Name : { ru : "Время на ответ", lv : "Atbiles laiks", en : "Answer time" },
            Values : [ 30, 45, 60, 120 ]
        }});

    DebateAnswerTime.save();


    // WholeTime

    var DebateWholeTimeSchema = new Mongoose.Schema({

        WholeTime : {
            _id: { type : String },
            Name : {},
            Values : []
        }
    }, { collection : "debates" });

    var DebateWholeTimeModel = Mongoose.model("WholeTime", DebateWholeTimeSchema);


    var DebateWholeTime = new DebateWholeTimeModel({
        WholeTime: { //Код
            Name : { ru : "Общее время", lv : "Kopejais laiks", en : "Whole time" },
            Values : [ 10, 15, 30, 45, 60 ]
        }});

    DebateWholeTime.save();    */


    /***********/

    var PropertyModel = require('../../core/modules/debates/debatesSchemes').DebateModels.Property;
    var TopicModel = require('../../core/modules/debates/debatesSchemes').DebateModels.Topic;

    var Property = new PropertyModel({
            _id :  new ObjectId,
            Code : "Category",
            Name : { ru : "Категория", en : "Category" },
            Type : "L",
            Values : [
                { _id : new ObjectId, Name : { ru : "Спорт", en : "Sport" }},
                { _id : new ObjectId, Name : { ru : "Здоровье", en : "Health" }},
                { _id : new ObjectId, Name : { ru : "Работа", en : "Work" }},
                { _id : new ObjectId, Name : { ru : "Семья", en : "Family" }},
                { _id : new ObjectId, Name : { ru : "Животные", en : "Animals" }}
            ]});
    Property.save();

    //Пока обсуждения будут проходить между двумя участниками
  /*  var Property = new DebateProperties_Model({

            _id :  new ObjectId,
            Code : "MembersQuantity",
            Name : { ru : "Количество участников", en : "Members quantity" },
            Type : "L",
            Values : [
                { _id : new ObjectId, Name : { ru : 2, en : 2 }},
                { _id : new ObjectId, Name : { ru : 3, en : 3 }}
            ]});
    Property.save();        */

    Res.render('index.html', {
        title : "Index",
        layout: false
    });

});


Server = Http.createServer(App)
    , Io = require('socket.io').listen(Server);

Server.listen(App.get('port'), function(){
    console.log("Server listening on port " + App.get('port'));
});