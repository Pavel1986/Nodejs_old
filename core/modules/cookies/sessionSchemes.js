var Mongoose = require('mongoose');

exports.CookieSessionSchema = new Mongoose.Schema({
    _id : { type : String },
     session : {
         cookie : {
             originalMaxAge : { type : Number },
             expires        : { type : String },
             secure         : { type : Boolean },
             httpOnly       : { type : Boolean },
             path           : { type : String }
         },
         language : { type : String }
     },
     expires :       { type: Date },
     authorized :    { type : Boolean },
     UserID :        { type : String },
     SocketID :      [],
     DebatesFilter : {
         arSort :         { },
         arFilter :       { },
         Limit: { type : Number },
         Skip : { type : Number}
     }
    }, { collection: 'sessions' }
);

exports.CookieModel = Mongoose.model('session', exports.CookieSessionSchema);