// background.js -- Non-persistent background page for extension.

// Refetch data when this changes.
var DATA_VERSION = 0;

var lstorage = getLocalStorage();
if (!lstorage) {
    throw new Error("Extension failed to access localStorage.");
}

var manifest = chrome.runtime.getManifest();

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
    signalLoadTab: function (request, sender, respond) {
        parsingTabs.push(sender.tab.id);
        respond(true);
    },
    amIParseTab: function (request, sender, respond) {
        respond(parsingTabs.indexOf(sender.tab.id) != -1);
    },
    deleteData: function (request, sender, respond) {
        lstorage.removeItem("isSetup");
        chrome.lstorage.local.clear(respond);
    },
    getIsSetup: function (request, sender, respond) {
        if (!lstorage.getItem("isSetup")) {
            return respond(false);
        }

        var dv = parseInt(lstorage.getItem("dataVersion"));
        if (isNaN(dv) || dv < DATA_VERSION) {
            return respond(false);
        }

        respond(true);
    },
    signalSetup: function (req, sender, respond) {
        lstorage.setItem("isSetup", true);
        lstorage.setItem("dataVersion", DATA_VERSION);
        respond(true);
    },
    openLoader: function () {
        var props = {
            url: 'loader/index.html',
        };
        
        chrome.tabs.create(props, function() {});
    },
};


chrome.runtime.onMessage.addListener(function (req, sender, respond) {
    console.log("Message from a content script:" + sender.tab.url +
            JSON.stringify(req));

    for (var key in messageHandlers) {
        if (req[key]) {
            // Returning false makes sender not wait for response.
            return messageHandlers[key](req, sender, respond);
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

