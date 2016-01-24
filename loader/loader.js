
function downloadYFb() {
  chrome.runtime.sendMessage({ signalLoadTab: 1 }, function (response) {
    location.href = 'https://students.yale.edu/facebook';
  });
}

function deleteData() {
  chrome.runtime.sendMessage({ deleteData: 1 }, function (response) {
    alert("All data cleared from your computer.");
    location.reload();
  });
}

function getIsSetup(cb) {
  chrome.runtime.sendMessage({ getIsSetup: 1 }, cb);
}

$(function() {
  document.querySelector(".js-downloadYFb").onclick = downloadYFb;
  document.querySelector(".js-deleteData").onclick = deleteData;
  getIsSetup(function(setup) {
    if (setup) {
      document.body.className += " setup";
    }
  });
});

