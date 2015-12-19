
function downloadYFb() {
    chrome.runtime.sendMessage({ downloadYFb: true }, function (response) {
    });
}

function deleteData() {
    chrome.runtime.sendMessage({ deleteData: true }, function (response) {
        location.reload();
    });
}

function getStudentCount(cb) {
    var count = 0;
    chrome.storage.local.get(null, function(all) {
        for (var lname in all) {
            count += all[lname].length;
        }
        cb(count);
    });
}

$(function() {
    document.querySelector(".js-downloadYFb").onclick = downloadYFb;
    document.querySelector(".js-deleteData").onclick = deleteData;
    getStudentCount(function (count) {
        document.querySelector(".status-count").innerHTML = count;
    });
});

