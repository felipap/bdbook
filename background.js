// background.js -- Non-persistent background page for extension.

function normName(x) {
    return x.toLowerCase();
}

function findName(name, cb) {
    //function getBetterMatch(name, items) {
    //}

    var names = name.split(" "),
        fname = names[0],
        lname = names[names.length-1];

    function getMatchScore(user) {
        if (normName(user.names[user.names.length-1]) != normName(lname)) {
            return 0;
        }
        if (normName(user.names[0]) == normName(fname)) {
            return 1;
        }
        return 0;
    }

    function getMatches(items) {
        var matches = [];
        // TODO: sort by match score.
        items.forEach(function (user) {
            if (getMatchScore(user) > 0) {
                console.log("matched!", user);
                matches.push(user);
            }
        });
        return matches;
    }

    function findByLName(cb) {
        var key = normName(lname);
        console.log("key", key)
        chrome.storage.local.get(key, function(result) {
            if (Object.keys(result).length == 0) {
                return cb(false);
            }
            console.log("result", result);
            cb(getMatches(result[key]));
        });
    }

    // Some throughout search.
    //function findElse(cb) {
        //return cb(false);
    //}

    console.log("Find me "+name);
    findByLName(function(found) {
        if (found) {
            cb(found);
            return;
        }
        return cb(false);
    });
}


function listener(request, sender, sendResponse) {
    console.log(sender.tab ?
            "from a content script:" + sender.tab.url :
            "from the extension");

    if (request.getMe) {
        findName(request.getMe, function (data) {
            console.log("sendng response", data)
            sendResponse({ students: data });
        })
    } else {
        throw new Error("Unrecognized request.");
    }

    return true;
}

chrome.runtime.onMessage.addListener(listener);
