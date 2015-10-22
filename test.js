/**
 * Created by VaibhavNamburi on 21/10/15.
 */

var each = function (collection, callback) {

    if (Array.isArray(collection) === false) {
        for (var key in collection) {
            callback(collection[key]);
        }
    }
    else
        {
            for (var i = 0, length = collection.length; i < length; i++) {
                callback(collection[i]);
            }
        }

    }

var map = function(collection,callback){

    var results = [];

    each(collection,function(result){
        results.push(callback(result));
    });

    return results;
};

var allottedMinutes = [15, 20, 32];

var double = function (num) {
    return num * 2;
};

console.log(map(allottedMinutes,double));