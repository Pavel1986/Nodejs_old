var Mongoose = require('mongoose');
var ObjectId = Mongoose.Schema.Types.ObjectId;
var DebateModels = new Object();

//Схема обсуждения
var TopicSchema = new Mongoose.Schema({

    AuthorID : { type : String },
    WinnerID : { type : String },
    Datetime_created : { type : Number},      //Во сколько создано обсуждение
    Datetime_started : { type : Number},      //Во сколько оно перешло в статус Processed
    Datetime_changed : { type : Number},      //Во сколько изменилось
    Datetime_temp_closing_ux : { type : Number}, //Предварительное время закрытия в unix формате, может меняться, если участники захотят продлить
    Datetime_closed : { type : Number},       //Время закрытия обсуждения, переход в Closed
    Language : { type : String },
    Title : { type : String },
    Description : { type : String },
    Status_code : { type : String },   //Property code
    Category : { type : String },   //Property code
    Members : [],
    Blocked : {
        Datetime : { type : Date},
        Code : { type : String },
        Reason : { type : String },
        ByUserId : { type : String }
    },
    Debates_max_time : { type : Number },  //Property value id
    Answer_time : { type : Number },  //Property value id
    Max_members_quantity : { type : Number }, //Property value id
    CloseTimerId : {},
    Views : { type : Number } // Уникальные просмотры

}, { collection : "debates" });
DebateModels.Topic = Mongoose.model('Topic', TopicSchema);

var TopicMessagesSchema = new Mongoose.Schema({

    UserID : { type : String },
    TopicID : { type : String },
    Datetime_created : { type : Number},
	Language : { type : String },
    Message : { type : String },
    Blocked : {
        Datetime : { type : Number},
        Code : { type : String },
        Reason : { type : String },
        ByUserId : { type : String }
    }

}, { collection : "TopicMessages" });
DebateModels.TopicMessages = Mongoose.model('TopicMessages', TopicMessagesSchema);

//В коллекцию добавляются все свойства
var PropertiesSchema = new Mongoose.Schema({
    _id: { type : ObjectId },
    Name : { type : String},
    Code : { type : String },
    Language : { type : String },
    Type : { type : String }
 }, { collection : "Properties" });

//В коллекцию добавляются все значения свойств
var PropertiesValuesSchema = new Mongoose.Schema({
    _id: { type : ObjectId },
    CategoryId : { type : ObjectId },
    Value : { type : String },
    Language : { type : String }

}, { collection : "PropertiesValues" });

DebateModels.Properties = Mongoose.model('Property', PropertiesSchema);
DebateModels.PropertiesValues = Mongoose.model('PropertyValue', PropertiesValuesSchema);
exports.DebateModels = DebateModels;