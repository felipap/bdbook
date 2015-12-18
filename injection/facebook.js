// main.js -- Main injection script for facebook.
// Recognizes profiles from Yalies and 

if (!window.jQuery) {
    throw new Error("jQuery required for extension not found.");
}

function isProfilePage() {
    var cntr = document.querySelector(".timelineReportContainer");
    if (cntr) {
        return true;
    }
    return false;
}


function normName(x) {
    return x.toLowerCase();
}

function findName(name, cb) {
    //function getBetterMatch(name, items) {
    //}

    var names = name.split(" "),
        fname = names[0],
        lname = names[names.length-1];

    function getMatchScore(user) {
        if (normName(user.names[user.names.length-1]) != normName(lname)) {
            return 0;
        }
        if (normName(user.names[0]) == normName(fname)) {
            return 1;
        }
        return 0;
    }

    function getMatches(items) {
        var matches = [];
        // TODO: sort by match score.
        items.forEach(function (user) {
            if (getMatchScore(user) > 0) {
                console.log("matched!", user);
                matches.push(user);
            }
        });
        return matches;
    }

    function findByLName(cb) {
        var key = normName(lname);
        console.log("key", key)
        chrome.storage.local.get(key, function(result) {
            if (Object.keys(result).length == 0) {
                return cb(false);
            }
            console.log("result", result);
            cb(getMatches(result[key]));
        });
    }

    // Some throughout search.
    //function findElse(cb) {
        //return cb(false);
    //}

    console.log("Find me "+name);
    findByLName(function(found) {
        if (found) {
            cb(found);
            return;
        }
        return cb(false);
    });
}

function getStudentsByName(name, cb) {
    findName(name, function(data) {
        console.log("sendng response", data)
        cb({ students: data });
    })
}
        
function handleProfile() {
    var tmlcntr = document.querySelector(".timelineReportContainer");

    function addUserData(data) {
        var ul = tmlcntr.querySelector(".uiList");
        if (!ul) {
            throw new Error("Failed to find ui component to append to.")
        }

        function formatLines(data) {
            // The information we get is: names, image, year, college,
            // email, dorm, and suite group.
            var lines = [];
            // for (var key in data) {
            //   lines.push({ text: ""+key+" > "+data[key] });
            // }
            
            if (data.college) {
                var html = "<div class='bdfb_y'>Y</div> ";
                html += "<span class='bdfb_college'>"+data.college+"</span> ";
                if (data.year) {
                    html += "<span class='bdfb_year'>"+data.year+"</span> ";
                }
                if (data.dorm) {
                    html += "<span class='bdfb_dorm'>("+data.dorm+")</span> ";
                }
                var title = "Information from Yale Facebook.";
                lines.push({ html: html, title: title });
            }

            return lines;
        }

        var lines = formatLines(data);
        console.log(lines);

        var current = ul.querySelectorAll(".bdfb_profile_li");
        for (var i=0; i<current.length; ++i) {
            ul.removeChild(current[i]);
        }

        for (var i=lines.length-1; i>=0; --i) {
            var li = document.createElement("li");
            li.className = "bdfb_profile_li";
            li.innerHTML = lines[i].html;
            li.setAttribute("title", lines[i].title);
            // ul.appendChild(li);
            $(ul).prepend(li);
        }
    }

    function isFromYale() {
        // Is there a better way to do this?
        // Get sidebar items, and look for "Studies at Yale University" or
        // "Lives in New Haven, Connecticut".
        var sbItems = tmlcntr.querySelectorAll("[data-profile-intro-card]");
        console.log(sbItems)

        for (var i=0; i<sbItems.length; ++i) {
            var text = $(sbItems[i]).text();
            console.log("text", text)
            if (text.match(/Studie[sd](?: [\w ]+)? at Yale University/)) {
                return true;
            }
            if (text.match(/(?:Also lives)|(?:Lives) in New Haven, Connecticut/)) {
                return true;
            }
        }

        return false;
    }

    if (!isFromYale()) {
        console.log("Not a Yale student.");
        return;
    }

    if (!document.querySelector("#fb-timeline-cover-name")) {
        throw new Error("Failed to get profile name.");
    }
    var name = document.querySelector("#fb-timeline-cover-name")
                .textContent.replace(/ \(.*\)/, '');
    console.log(name);
    getStudentsByName(name, function (response) {
    // chrome.runtime.sendMessage({ getMe: userName }, function (response) {
        console.log("response", response);
        if (response && response.students.length) {
            addUserData(response.students[0]);
        }
    });
    
}

function main() {
    function isProfilePage() {
        var cntr = document.querySelector(".timelineReportContainer");
        if (cntr) {
            return true;
        }
        return false;
    }

    console.log("PORRARARA")
    if (isProfilePage()) {
        console.log("IS PROFILE");
        handleProfile();
    }
}

var oldUrl = location.pathname;
var oldName_ = document.querySelector("#fb-timeline-cover-name");
if (oldName_) {
    var oldName = oldName_.textContent;
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.urlChange) {
        var newUrl = location.pathname;
        var newName_ = document.querySelector("#fb-timeline-cover-name");
        if (newName_) {
            var newName = newName_.textContent;
        }

        if (location.pathname != oldUrl || newName != oldName) {
            oldName = newName;
            oldUrl = newUrl;

            main();
        }
    } else {
        throw new Error("Unrecognized message from background page.");
    }
});


$(main);
