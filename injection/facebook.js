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
            for (var key in data) {
                lines.push({ text: ""+key+" > "+data[key] });
            }
            return lines;
        }

        var lines = formatLines(data);
        console.log(lines);
        for (var i=0; i<lines.length; ++i) {
            var li = document.createElement("li");
            li.className = "bdfb_profile_li";
            li.innerHTML = lines[i].text;
            ul.appendChild(li);
        }
    }
        
    function isFromYale() {
        // Is there a better way to do this?
        // Get sidebar items, and look for "Studies at Yale University" or
        // "Lives in New Haven, Connecticut".
        var sbItems = tmlcntr.querySelectorAll("[data-profile-intro-card]");

        for (var i=0; i<sbItems.length; ++i) {
            var text = $(sbItems[i]).text();
            if (text == "Lives in New Haven, Connecticut" ||
                text == "Studies at Yale University" ||
                text == "Studied at Yale University") {
                return true;
            }
        }

        return false;
    }

    if (!isFromYale()) {
        console.log("Not a Yale student.");
        return;
    }

    var userName = document.querySelector("#fb-timeline-cover-name");
    if (!userName) {
        throw new Error("Failed to get profile name.");
    }
    userName = userName.textContent;

    chrome.runtime.sendMessage({ getMe: userName }, function (response) {
        console.log("response", response);
        if (response) {
            addUserData(response.students[0]);
        }
    });
    
}

$(function () {
    if (isProfilePage()) {
        handleProfile();
    }
});
