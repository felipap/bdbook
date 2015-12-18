
function downloadYFb() {
    chrome.runtime.sendMessage({ downloadYFb: true }, function (response) {
    });
}

$(function() {
    document.querySelector(".js-downloadYFb").onclick = downloadYFb;
});

