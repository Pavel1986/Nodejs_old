var Mongoose = require('mongoose');

//Схема авторизованного пользователя

exports.ClientSchema = new Mongoose.Schema({
    Datetime_created:    { type : Number },
	Email:    { type : String },
	Password: { type : String },
	Name:     { type : String },
    DefaultInterfaceLanguage: { type : String}, // Язык, который выбирает пользователь по умолчанию. Этот язык будет использоваться для отправки почтовых сообщений и языка по умолчанию при авторизации на сайт
    UserGroups : [],
    Points :    { type : Number }, // Общее количество очков, на основании их определяется уровень пользователя. Пользователь не может их тратить.
    Coins :    { type : Number }   // Общее количество монет, на них можно покупать возможности.

}, { collection : "users" });
exports.User_M = Mongoose.model('user', exports.ClientSchema);
