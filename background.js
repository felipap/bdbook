// background.js -- Non-persistent background page for extension.

function onStateChange(details) {
    console.log("url", arguments);

    if (!details.url.match(/https?:\/\/(?:www.)?facebook.com/)) {
        return;
    }

    chrome.tabs.sendMessage(details.tabId, { urlChange: true, details: details });
}

chrome.webNavigation.onHistoryStateUpdated.addListener(onStateChange);

