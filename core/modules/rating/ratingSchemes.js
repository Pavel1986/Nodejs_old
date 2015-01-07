var Mongoose = require('mongoose');
var RankingModels = new Object();

//Схема голосований за участников обсуждения
var VotesForMembersSchema = new Mongoose.Schema({
    TopicID       : { type : String },       //В каком обсуждение проголосовали
    TopicMemberID : { type : String }, //За кого проголосовали
    UserID        : { type : String } //Кто проголосовал

}, { collection : "VotesForMembers" });
RankingModels.VotesForMembers = Mongoose.model('VotesForMembers', VotesForMembersSchema);

//Схема голосований за обсуждение
var VotesForTopicSchema = new Mongoose.Schema({
    TopicID : { type : String},
    UserID  : { type : String }
}, { collection : "VotesForTopics" });

//Схема голосований за отправленое сообщение участником обсуждения
var VotesForTopicMessageSchema = new Mongoose.Schema({
    TopicID          : { type : String },
    TopicMemberID    : { type : String },
    TopicMessageID   : { type : String },
    UserID           : { type : String }

}, { collection : "VotesForTopicMessages" });

exports.RankingModels = RankingModels;
