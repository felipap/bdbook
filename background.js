// background.js -- Non-persistent background page for extension.

// Adapted from https://mathiasbynens.be/notes/localstorage-pattern
function getLocalStorage() {
    var storage;
    var fail;
    var uid;
    try {
        uid = new Date;
        (storage = window.localStorage).setItem(uid, uid);
        fail = storage.getItem(uid) != uid;
        storage.removeItem(uid);
        fail && (storage = false);
        return storage;
    } catch (exception) {
        return false;
    }
}

var lstorage = getLocalStorage();
if (!lstorage) {
    throw new Error("Extension failed to access localStorage.");
}

var manifest = chrome.runtime.getManifest();

//

// TODO:
// Will this always work, even though the background is not persistent?
var parsingTabs = [];

var messageHandlers = {
    deleteDate: function (request, sender, respond) {
        lstorage.removeItem("isSetup");
        chrome.storage.local.clear(function () {
            respond();
        });
    },
    downloadYaleFacebook: function (request, sender, respond) {
        var props = {
            url: 'https://students.yale.edu/facebook',
        };

        chrome.tabs.create(props, function(tab) {
            console.log("Tab:", tab, tab.id);
            parsingTabs.push(tab.id);
        });
    },
    getStatus: function (request, sender, respond) {
        var is = lstorage.getItem("isSetup");
        respond({ isSetup: is });
    },
    amIParseTab: function (request, sender, respond) {
        respond(parsingTabs.indexOf(sender.tab.id) != -1);
    },
    deleteData: function (request, sender, respond) {
        lstorage.removeItem("isSetup");
        chrome.lstorage.local.clear(respond);
    },
    updateSetup: function () {
        lstorage.setItem("isSetup", true);
        respond();
    },
    openLoader: function () {
        var props = {
            url: 'loader/index.html',
        };
        
        chrome.tabs.create(props, function() {});
    },
};


chrome.runtime.onMessage.addListener(function (req, sender, respond) {
    console.log("Message from a content script:" + sender.tab.url);

    for (var key in messageHandlers) {
        if (req[key]) {
            // Returning false makes sender not wait for response.
            return handlers[key](req, sender, respond);
        }
    }

    throw new Error("Unrecognized message.\n"+JSON.stringify(req));
});

chrome.webNavigation.onHistoryStateUpdated.addListener(function (details) {
    if (!details.url.match(/https?:\/\/(?:www.)?facebook.com/)) {
        return;
    }

    chrome.tabs.sendMessage(details.tabId, {
        urlChange: true,
        details: details
    });
});

