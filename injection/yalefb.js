// yalefb.js
// Injection script for Yale Facebook. Stores json information about Yale
// students to be used by facebook's content script, using chrome.storage.

if (!window.jQuery) {
  throw new Error("jQuery required for extension not found.");
}

function parsePage() {
  function parseStudentContainer(c) {
    var qs = c.querySelector.bind(c);
    var data = {};

    var names = qs(".student_name").textContent.split(",");
    data.names = utils.filter(names[1].split(" ").concat(names[0].split(" ")));
    // data.image = qs(".student_img img").src;
    data.year = qs(".student_year").innerHTML;
    data.college = qs(".student_text_container > .student_info").innerHTML;

    var email = qs(".student_info .email");
    if (email) {
      data.email = email.innerHTML;
    }

    // Parse second .student_info to get more info. (Slice off email)
    var lines = qs(".student_info:last-of-type").innerHTML.split("<br>").slice(1);

    // Order of data lines is this:
    // - Suite (optional)
    // - ID? format "X-XXXX /"
    // - [*] Multiple ddress lines (optional)
    // - Declared major
    // - Birthday (optional)

    function isBirthday(x) {
      return !isNaN(new Date(x));
    }

    function isDorm(x) {
      return x.match(/[\d\w]+-[\d\w]+/);
    }

    function isSuiteGroup(x) {
      return x.match(/[\d\w]+-[\d\w]+ \//);
    }

    var addrStart;
    if (isDorm(lines[0])) {
      //data.dorm = lines[0];
      if (isSuiteGroup(lines[1])) {
        // data.sid = lines[1];
        // Hash suite group id to protect students.
        data.hsid = hash(lines[1]);
        addrStart = 2;
      } else {
        addrStart = 1;
      }
    } else {
      if (isSuiteGroup(lines[0])) {
        // data.sid = lines[0];
        data.hsid = hash(lines[0]);
        addrStart = 1;
      } else {
        addrStart = 0;
      }
    }

    var addrEnd;
    if (isBirthday(lines[lines.length-1])) {
      addrEnd = lines.length-2;
      data.birthday = lines[lines.length-1];
      data.major = lines[lines.length-2];
    } else {
      addrEnd = lines.length-1;
      data.major = lines[lines.length-1];
    }

    // Don't store people's addresses, dude.
    // data.address = lines.slice(addrStart, addrEnd).join(" ")

    return data;
  }

  var students = [];
  var contrs = document.querySelectorAll(".student_container2");
  for (var i=0; i<contrs.length; i++) {
    try {
      students.push(parseStudentContainer(contrs[i]));
    } catch (e) {
      var name_ = contrs[i].querySelector(".student_name");
      if (name_) {
        name = name_.textContent;
      } else {
        name = "undefined";
      }
      console.warn("Failed to parse student '"+name+"'.\n"+e);
    }
  }

  return students;
}

function storeStudents(stds) {
  // Students are organized by last name, in an associative table.
  // The key is the normalized version of the student's first name.

  var data = {};
  for (var i=0; i<stds.length; ++i) {
    var dude = stds[i];
    var nkey = "name:"+normName(dude.names[0]);
    if (data[nkey]) {
      data[nkey].push(dude);
    } else {
      data[nkey] = [dude];
    }

		if (dude.hsid) {
      var skey = "suite:"+dude.hsid;
      if (data[skey]) {
        data[skey].names.push(dude.names.join(" "));
      } else {
        data[skey] = { t: Date.now(), names: [dude.names.join(" ")] };
      }
    }
  }

  chrome.storage.local.clear(function() {
    chrome.storage.local.set(data, function() {
      chrome.storage.local.get(null, function (items) {
        console.log("just saved:", items);
      })
    });
  });
}

function InfoBox() {
  var html = [
    "<div class='bdb_blackout'></div>",
    "<div class='bdb bdb_box_wrapper'>",
    "<h1>Bulldog Book loader</h1>",
    "<p>This is a required step to make the extension work.</p>",
    "<div class='status'>",
    "PLEASE WAIT! This page is loading.",
    "</div>",
    "</div>",
  ].join("");

  var $el = $(html);

  this.show = function () {
    $("body").append($el);
    return $el;
  }

  this.showParsing = function () {
    $el.find(".status").html("<strong>PARSING data! Don't close tab.</strong>"+
                             " <p>This should take less than a minute!</p>");
                             return $el;
  }

  this.showLoading = function () {
    $el.find(".status").html("<strong>Loading! Don't close tab.</strong>"+
                             " <p>This should take less than a minute!</p>");
                             return $el;
  }

  this.showSuccess = function () {
    $el.find(".status")
    .addClass("success")
    .html("<strong>Success!</strong> Reload your facebook tab to see the results.<br />(You can close this tab now.)");
    return $el;
  }
}

function getQueryParam(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
    results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function isListDisplay() {
  return getQueryParam("textDisplay") == "true" &&
    getQueryParam("numberToGet") == "-1" &&
      getQueryParam("currentIndex") == "-1";
}

function getCurrentCollege() {
  var st = document.querySelector("#searchTerm");
  if (!st) {
    throw new Error("Failed to detect current college.");
  }

  return st.getAttribute("placeholder").match(/(.*) $/)[1];
}

function main() {
  infoBox = new InfoBox();
  infoBox.show();

  $(function () {
    // Goto Yale list view (we don't want only students from one college).
    if (getCurrentCollege() != "Yale") {
      infoBox.showLoading();
      $.get("/facebook/ChangeCollege?newOrg=Yale%20College");
      setTimeout(function() {
        var url = "/facebook/PhotoPage?currentIndex=-1&textDisplay=true&numberToGet=-1";
        window.location.href = url;
      }, 2000);
      return;
    }

    // Show list display.
    if (!isListDisplay()) {
      infoBox.showLoading();
      var url = "/facebook/PhotoPage?currentIndex=-1&textDisplay=true&numberToGet=-1";
      window.location.href = url;
      return;
    }

    infoBox.showParsing();

    // gotoListDisplay();
    console.log("Starting to parse page.");
    var students = parsePage();
    storeStudents(students);

    console.log("Sending message!");
    chrome.runtime.sendMessage({signalSetup: true}, function(response) {
      console.log("OPS?");
      infoBox.showSuccess();
    });
  });
}

// When a yale directory page accessed, check with background script if
// it was opened by our data loader.
chrome.runtime.sendMessage({ amIParseTab: true }, function (response) {
  if (response) {
    setTimeout(main, 500);
  }
});

