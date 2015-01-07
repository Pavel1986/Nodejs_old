var CookieSession = require('./sessionSchemes').CookieModel;

exports.FindCookieSessionByUserID = function(UserID, callback){

    CookieSession.findOne( { "UserID" : UserID }, function (err, rsResult) {

        if (err) { console.log("Error: Error while finding cookie session. Check syntax."); }

        if(rsResult){

            var obResult = rsResult.toObject();

            obResult.ParsedSession = JSON.parse(obResult.session);

            callback(obResult);

        }else{
            callback(false);
        }

    });
}

exports.FindCookieSessionByID = function(SessionID, callback){

    CookieSession.findOne( { "_id" : SessionID }, function (err, rsResult) {

        if (err) { console.log("Error: Error while finding cookie session. Check syntax."); }

        if(rsResult){

            var obResult = rsResult.toObject();

            obResult.ParsedSession = JSON.parse(obResult.session);

            callback(obResult);

        }else{
            callback(false);
        }

    });
}

exports.UpdateCookieSessionByID = function(SessionID, arParams, callback){

    CookieSession.findByIdAndUpdate( { "_id" : SessionID}, arParams, { "lean" : true }, function (err, Result) {

        if (err) { console.log("Error: Error while updating cookie session. Check syntax."); }

        if(Result){

            Result.ParsedSession = JSON.parse(Result.session);

            callback(Result);

        }else{
            callback(false);
        }

    });
}

exports.CookieModel = CookieSession;

