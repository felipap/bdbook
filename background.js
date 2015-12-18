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

var storage = getLocalStorage();
if (!storage) {
    throw new Error("Extension failed to access localStorage.");
}

function openLoader(opts, cb) {
    var props = {
        url: 'loader/index.html',
    };
    
    chrome.tabs.create(props, function(cb) {});
}

function loaderOpenYFb(opts, cb) {
    var props = {
        url: 'https://students.yale.edu/facebook',
    };

    chrome.tabs.create(props, function(tab) {
        console.log("Tab:", tab, tab.id);
        setTimeout(function(){
            chrome.tabs.sendMessage(tab.id, { parseAndDownload: true },
                function (response) {
                    console.log(response);
                });
        }, 3000);
    });
}

function onGetMessage(request, sender, respond) {
    console.log(sender.tab ?
    "from a content script:" + sender.tab.url :
    "from the extension");

    if (request.openLoader) {
        openLoader({}, function() {
        });
    } else if (request.updateHasSetup) {
        storage.setItem("isSetup", true);
        respond();
    } else if (request.deleteData) {
        storage.removeItem("isSetup");
        chrome.storage.local.clear(respond);
    } else if (request.getStatus) {
        var is = storage.getItem("isSetup");
        respond({ isSetup: is });
    } else if (request.downloadYFb) {
        loaderOpenYFb({}, function () {
        });
    } else {
        throw new Error("Didn't understand message.\n"+JSON.stringify(request));
    }

    return true;
}

chrome.runtime.onMessage.addListener(onGetMessage);

function onStateChange(details) {
    console.log("url", arguments);

    if (!details.url.match(/https?:\/\/(?:www.)?facebook.com/)) {
        return;
    }

    chrome.tabs.sendMessage(details.tabId, { urlChange: true, details: details });
}

chrome.webNavigation.onHistoryStateUpdated.addListener(onStateChange);

