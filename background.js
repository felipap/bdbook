// background.js -- Non-persistent background page for extension.

// Refetch data when this changes.
var DATA_VERSION = 2;

var lstorage = getLocalStorage();
if (!lstorage) {
  throw new Error("Extension failed to access localStorage.");
}

var manifest = chrome.runtime.getManifest();

// THIS IS FUGLY!
var LoaderTabTracker = function() {
  function getLT() {
    if (lstorage.getItem("loaderTabs") === null) {
      lstorage.setItem("loaderTabs", "{}")
    }
    return JSON.parse(lstorage.getItem("loaderTabs"))
  }

  function setLT(tabs) {
    tabs.saved = Date.now()
    lstorage.setItem("loaderTabs", JSON.stringify(tabs))
  }

  // TODO: reset tabs every now and then.
  // if (getLT().saved + 1000*60*3 < Date.now()) {
  // }

  return {
    check: function (id) {
      var tabs = getLT();
      return tabs[id] !== undefined;
    },
    add: function (id) {
      var tabs = getLT();
      if (tabs[id] !== undefined) {
        console.warn("Tab id "+id+" was already there.");
      }
      tabs[id] = Date.now();
      return setLT(tabs);
    },
  }
}();

var messageHandlers = {
  deleteData: function (request, sender, respond) {
    lstorage.removeItem("isSetup");
    chrome.storage.local.clear(function () {
      respond();
    });
    return true;
  },
  signalLoadTab: function (request, sender, respond) {
    LoaderTabTracker.add(sender.tab.id);
    respond(true);
  },
  amIParseTab: function (request, sender, respond) {
    respond(LoaderTabTracker.check(sender.tab.id));
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
  openHelper: function () {
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

