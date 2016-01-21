
function downloadYFb() {
  chrome.runtime.sendMessage({ signalLoadTab: 1 }, function (response) {
    location.href = 'https://students.yale.edu/facebook';
  });
}

function deleteData() {
  chrome.runtime.sendMessage({ deleteData: 1 }, function (response) {
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
  if (document.querySelector(".status-count")) {
    getStudentCount(function (count) {
      document.querySelector(".status-count").innerHTML = count;
    });
  }
});

