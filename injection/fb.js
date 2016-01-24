// main.js -- Main injection script for facebook.

if (!window.jQuery) {
  throw new Error("jQuery required for extension not found.");
}

// Needs localStorage in order to work.
var lstorage = getLocalStorage();
if (!lstorage) {
  throw new Error("Couldn't open/use localStorage.");
}

function findByName(name, cb) {
  var names = name.split(" "),
    fname = names[0],
    lname = names[names.length-1];

  function isSameName(a, b) {
    return normName(a) === normName(b);
  }
 
  function getMatchScore(student) {
    var score = 0;
    if (isSameName(student.names[0], fname)) {
      score += 2;
    } else {
      // If not first name, fname must be a nickname.
      if (normName(fname) in nicknames && isSameName(nicknames[normName(fname)], student.names[0])) {
        // Yes it is.
        score += 1;
      } else {
        throw new Error("Unexpected student "+JSON.stringify(student)+" matched for "+names+".");
      }
    }

    var lastName = student.names[student.names.length-1];
    if (!isSameName(lastName, lname)) {
      score = 0;
    }

    return score;
  }

  function onGetFound(people) {
    if (people.length === 0) {
      return cb(false);
    }

    var matches = [];
    (function processStudent(students) {
      if (students.length === 0) {
        return cb(matches);
      }
      
      var student = students.pop();
      if (getMatchScore(student) > 0) {
        console.log(student)

        if (!student.hsid) {
          matches.push(student);
          processStudent(students);
          return;
        }

        chrome.storage.local.get("suite:"+student.hsid, function(r) {
          student.suitemates = r["suite:"+student.hsid];
          matches.push(student);
          processStudent(students);
        });
      } else {
        processStudent(students);
      }
    })(people);
  }

  var key = "name:"+normName(fname);
  chrome.storage.local.get(key, function (result) {
    // If first name has a nickname associated to it, look in storage
    // for people with first name equal to the one associated with the nickname.
    if (normName(fname) in nicknames) {
      var key2 = "name:"+normName(nicknames[normName(fname)]);
      chrome.storage.local.get(key2, function (f2) {
        onGetFound(result[key].concat(f2[key2]));
      });
    } else {
      onGetFound(result[key]);
    }
  });
}


// Get ui container to add BDBook line to.
function getUIContainer() {
  var cntrs = document.querySelectorAll(".fbTimelineUnit");
  for (var i=0; i<cntrs.length; ++i) {
    var cntr = cntrs[i].querySelector("div > div"); // .timelineReportContainer");
    var dataset;
    try {
      dataset = JSON.parse(cntr.dataset.gt);
    } catch (e) {
      continue;
    }
    var type = dataset.timeline_unit_type;
    if (type == "ContextItemsUnit" || type == "IntroCardUnit") {
      return cntr;
    }
  }

  return null;
}

function handleProfile(name, container) {
  console.log("Looking for name:", name);
  if (!name || !container) {
    throw new Error("Invalid name or container arguments.");
  }

  var ul = container.querySelector(".uiList");
  if (!ul) {
    throw new Error("Failed to find ui component to append to.");
  }

  function removePreviousLines() {
    var current = ul.querySelectorAll(".bdfb_profile_li");
    for (var i=0; i<current.length; ++i) {
      ul.removeChild(current[i]);
    }
  }

  function makeYaleLine(inner, className) {
    var li = document.createElement("li");
    li.className = "bdfb_profile_li "+(className || "");
    li.innerHTML = "<div class='bdfb_y'>Y</div>"+inner;
    li.setAttribute("title", "BD Book extension for Chrome.");
    return li;
  }

  function showNotFound() {
    var li = makeYaleLine("Person not found in Yale Directory.");
    removePreviousLines();
    console.log("li", li);
    $(ul).prepend(li);
  }

  function showSetupBDBook() {
    var li = makeYaleLine("Click here to start seeting yalies' info.</span>",
      "bdfb_profile_li_tryfind");
      li.onclick = function() {
        chrome.runtime.sendMessage({ openHelper: true }, function (response) {
        });
      };
      $(ul).prepend(li);
  }

  function showTryFind(onclick) {
    var li = makeYaleLine("<span>Try to find "+name.split(" ")[0]+
      " in Yale Facebook.</span>",
      "bdfb_profile_li_tryfind");
      li.onclick = onclick;
      $(ul).prepend(li);
  }

  function showResultsLine(data) {
    removePreviousLines();

    var person = data[0];

    var html = "<span class='bdfb_college'>"+person.college+"</span> ";
    if (person.year) {
      html += "<span class='bdfb_year'>"+person.year+"</span> ";
    }
    if (person.dorm) {
      html += "<span class='bdfb_dorm'>("+person.dorm+")</span> ";
    }
    if (person.suitemates) {
      var date = new Date(person.suitemates.t).toLocaleDateString('en');
      var onclick = 'alert("In '+person.names[0]+'&rsquo;s suite as of '+date+': \\n &bull; '+
        person.suitemates.names.join("\\n &bull; ")+'")';
      html += "<a href='#' onClick='"+onclick+"'>(see suite)</a> ";
    }


    html += "<a href='#' class='bdfb_help'>MORE</a>";

    var li = makeYaleLine(html);

    li.querySelector(".bdfb_help").onclick = function() {
        chrome.runtime.sendMessage({ openHelper: true }, function (response) {
        });
    };
    li.setAttribute("title", "Information from Yale Facebook.");
    $(ul).prepend(li);
  }

  function isFromYale() {
    // Is there a better way to do this?
    // Get sidebar items, and look for "Studies at Yale University" or
    // "Lives in New Haven, Connecticut".
    var sbItems = container.querySelectorAll("[data-profile-intro-card]");

    // When students don't disclose on their Facebook profiles that they
    // live in New Haven or attend Yale, we display a "Try to find X in
    // Yale Directory" button. Then, when we're able to find these students,
    // we cache their facebook pathnames, so that users don't have to
    // continuously look for them.

    var ypaths = lstorage.getItem("ypaths");
    if (ypaths) {
      if (JSON.parse(ypaths)[location.pathname]) {
        return true;
      }
    }

    for (var i=0; i<sbItems.length; ++i) {
      var text = $(sbItems[i]).text();
      if (text.match(/Studie[sd](?: [\w ]+)? at Yale University/)) {
        return true;
      }
      if (text.match(/(?:Also lives)|(?:Lives) in New Haven, Connecticut/)) {
        return true;
      }
    }

    return false;
  }

  // Request status from background: has dir data been downloaded, ...?
  chrome.runtime.sendMessage({ getIsSetup: 1 }, function (isSetup) {
    console.log("Is setup?", isSetup);
    if (!isSetup) {
      showSetupBDBook();
      return;
    }

    if (isFromYale()) {
      findByName(name, function(students) {
        if (students.length) {
          showResultsLine(students);
        } else {
          showNotFound();
          console.log("Student not found.");
        }
      });
    } else {
      // Show "Try to find this person." button.
      showTryFind(function() {
        findByName(name, function(students) {
          if (students.length) {
            var yps = lstorage.getItem("yps");
            if (yps) {
              yps = JSON.parse(yps);
            } else {
              yps = {};
            }
            yps[location.pathname] = students[0].names;
            lstorage.setItem("ypaths", JSON.stringify(yps));
            showResultsLine(students);
          } else {
            showNotFound();
            console.log("Student not found.");
          }
        });
      });
    }
  });
}

function main() {
  function getName() {
    function stripNickname(name) {
      return name.replace(/ \(.*\)/, '');
    }
    var c = document.querySelector("#fb-timeline-cover-name");
    if (!c) {
      return false;
    }
    return stripNickname(c.textContent);
  }

  function isProfilePage() {
    var cntr = document.querySelector(".timelineReportContainer");
    if (cntr) {
      return true;
    }
    return false;
  }

  // Check if page has sidebar box, and if the name of the user in the
  // profile can be found.

  var name = getName();
  var container = getUIContainer();

  // If profile name or ui container to add to are not found...
  if (!name || !container) {
    console.log("MATCH?", location.pathname);
    // Is it really a profile page? Check url. (this can be improved)
    if (location.pathname.match(/^\/(\d+|[A-Za-z0-9\.]+)\/?$/)) {
      // Loop till we can find the container and the name.
      // TODO: this is really suboptimal.
      setTimeout(main, 1000);
    }
    console.log("Not proper profile page.");
    return;
  }

  var ca = document.querySelector("#contentArea");
  if (ca.dataset && ca.dataset.__bdbook) {
    // Page was already handled.
    return;
  }
  // Mark content area to signal that we're handling this.
  ca.dataset.__bdbook = true;

  console.log("Is profile page with sidebar.");
  if (isProfilePage()) {
    handleProfile(name, container);
    return true; // All good.
  }
}

// Execute main on start, on state change, and when our background page
// tells us that a push-state event has occured in our tab.
$(main);

$(window).on("statechange", function() {
  // console.log("STATE CHANGE.")
  setTimeout(main, 1500);
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.urlChange) {
    // console.log("PUSH CHANGE.");
    setTimeout(main, 1500);
  } else {
    throw new Error("Unrecognized message from background page.");
  }
});
