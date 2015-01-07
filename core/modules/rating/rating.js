var Mongoose = require('mongoose');
var async = require('async');
/* Получение схем для mongoose моделей */

//var CookieSession = require('../cookies/session.js');
var MainModule = require('../main/main.js');
var DebatesModule = require('../debates/debates.js');
var UserModel = require('../user_system/userSchemes').User_M;
var VotesForMemberModel = require('./ratingSchemes').RankingModels.VotesForMembers;

var GetMemberVotesCountByID = function(TopicID, MemberID, callback){

    VotesForMemberModel.count({ TopicID: TopicID, TopicMemberID : MemberID }, function (Err, VotesCount) {

        if(Err){
            console.log("Error while getting member votes count. Topic : " + TopicID + " , MemberID : " + MemberID);
            callback(0);
        }
        callback(VotesCount);

    });
};
exports.GetMemberVotesCountByID = GetMemberVotesCountByID;

var GetMembersVotesCountByID = function(TopicID, callback){

    var DebatesModule = require('../debates/debates');
    DebatesModule.GetTopicByID(TopicID, function(TopicFound){

        if(!TopicFound){
            callback(false);
        }

        var MembersVotes = new Object();

        //Для каждого элемента
        async.each(TopicFound.Members, function (Member, callback) {

            GetMemberVotesCountByID(TopicID, Member, function(VotesCount){

                MembersVotes[Member] = VotesCount;

                callback();
            });

        }, function (err) {
            if(err){
                console.log("Error while adding values");
                callback(false);
            }else{
                callback(MembersVotes);
            }

        });

    });

};
exports.GetMembersVotesCountByID = GetMembersVotesCountByID;

var GetMembersStructure = function(MembersVotes, callback){

    var arResult = new Object();
    arResult.Structure = new Object();
    arResult.Structure.Winner = "";
    arResult.Structure.Members = new Array();
    arResult.Structure.Losers = new Array();
    arResult.MembersVotes = MembersVotes;
    arResult.TopicResult = "";

    async.waterfall([
        function (callback) {

            arResult.MembersVotesArray = new Array();

            //Переводим в массив
            MainModule.GetObjectValuesArray(arResult.MembersVotes, function(MembersVotesArray){

                arResult.MembersVotesArray = MembersVotesArray;
                arResult.MaxValue =  Math.max.apply(null, arResult.MembersVotesArray);

                MainModule.HasArrayUniqueValue(arResult.MaxValue, arResult.MembersVotesArray, function(ArrayHasUniqueValue){
                    arResult.ArrayHasUniqueValue = ArrayHasUniqueValue;
                    callback(null, arResult);
                });

            });

        },
        function (arResult, callback) {

            //Формируем структуру
            async.each(Object.keys(arResult.MembersVotes), function (UserID, callback) {

                //Если участник получил отрицательное количество баллов
                if(arResult.MembersVotes[UserID] < 0){
                    arResult.Structure.Losers.push(UserID);
                }else if(arResult.MembersVotes[UserID] === arResult.MaxValue && arResult.ArrayHasUniqueValue){
                //Если участник собрал максимальное кол-во баллов и он единственный кто столько собрал
                    arResult.Structure.Winner = UserID;
                }else{
                //В остальных случаях он просто участвовал, но не выиграл и не проиграл
                    arResult.Structure.Members.push(UserID);
                }

                callback();

            }, function (err) {

                if(arResult.Structure.Winner.length > 0){
                    arResult.TopicResult = "Winner";
                }else if(arResult.Structure.Members.length >= 2){
                    arResult.TopicResult = "Draw";
                }else{
                    arResult.TopicResult = "None";
                }

                callback(null, arResult);
            });
        }

    ], function (Error, arResult) {

        if (!Error) {

            //Возвращаем сформированную структуру участников обсуждения по категориям
            callback(arResult);

        } else {

            console.log('Error while forming users points categories.');
            callback(false);
        }
    });




}
exports.GetMembersStructure = GetMembersStructure;

var HasUserVotedForTopicMember = function(TopicID, MemberID, UserID, callback){
    VotesForMemberModel.findOne( { TopicID : TopicID, TopicMemberID : MemberID, UserID : UserID  }, function(Err, Vote){
        if(Err){
            console.log("Error while finding current user one vote for topic member");
        }
        if(Vote){
            callback(true);
        }else{
            callback(false);
        }
    });
};
exports.HasUserVotedForTopicMember = HasUserVotedForTopicMember;

var UpdateVoteForMember = function (TopicID, MemberID, UserID, callback){
//MemberID - тот за кого голосуют
//UserID - тот кто голосует

    async.waterfall([
        function (callback) {
            //Проверяем тот, за кого голосуем, находится ли в обсуждении
            var DebatesModule = require('../debates/debates');
            var arResult = new Object();

            DebatesModule.CheckIfMemberIsInTopic(MemberID, TopicID, function(MemberFound){
                if(MemberFound){
                    callback(null, arResult);
                }else{
                    console.log("This member : " + MemberID +  " is not in topic : " + TopicID + ". Voted by : " +  UserID + " Maybe hack try");
                    callback(true, arResult);
                }
            });
        },function (arResult, callback) {
            //Изменяем или добавляем запись
            VotesForMemberModel.findOneAndUpdate( { "TopicID" : TopicID, "UserID" : UserID  }, { "TopicID" : TopicID, "TopicMemberID" : MemberID, "UserID" : UserID  }, { "upsert" : true }, function(Query){
                callback(null, arResult);
            });
        }
    ],function (Error, MessageContent) {

        if (Error) { console.log('Error while updating VoteForMember'); }
        callback();
    });

};
exports.UpdateVoteForMember = UpdateVoteForMember;

var UpdateMembersPoints = function(MembersStructure, callback){

    var arResult = new Object();
    arResult.MembersStructure = MembersStructure;

    async.waterfall([
        function (callback) {
            //Если есть победитель
            if(arResult.MembersStructure.Winner.length > 0){

                    //Присуждаем ему три пункта
                    UpdateMemberPoints(arResult.MembersStructure.Winner, 3, function(Updated){
                        callback(null, arResult);
                    })

            }else{
                callback(null, arResult);
            }

        },
        function (arResult, callback) {
            //Если просто участники
            if(arResult.MembersStructure.Members.length > 0){

                async.each(arResult.MembersStructure.Members, function (UserID, callback) {
                    //Присуждаем им по одному пункту
                    UpdateMemberPoints(UserID, 1, function(Updated){

                        callback();
                    })

                }, function (err) {
                    callback(null, arResult);
                });

            }else{
                callback(null, arResult);
            }

        },
        function (arResult, callback) {
            //Если штрафники
            if(arResult.MembersStructure.Losers.length > 0){

                async.each(arResult.MembersStructure.Losers, function (UserID, callback) {
                    //То снимаем пункт
                    UpdateMemberPoints(UserID, -1, function(Updated){

                        callback();
                    })

                }, function (err) {
                    callback(null, arResult);
                });

            } else{
                callback(null, arResult);
            }

        }

    ], function (Error, arResult) {

        if (!Error) {

            callback(true);

        } else {

            console.log("Error while updating members points");
            callback(false);
        }
    });

}
exports.UpdateMembersPoints = UpdateMembersPoints;

var UpdateMemberPoints = function(UserID, Points, callback){

    UserModel.findOneAndUpdate({ _id : UserID }, { $inc: { Points : Points } }, function(err, doc){

        if(!err){
            callback(true);
        }else{
            callback(false);
        }


    })
}
exports.UpdateMemberPoints = UpdateMemberPoints;