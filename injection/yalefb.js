// yalefb.js
// Injection script for Yale Facebook. Stores json information about Yale
// students to be used by facebook's content script, using chrome.storage.

if (!window.jQuery) {
    throw new Error("jQuery required for extension not found.");
}

var utils = {
    filter: function (els, predicate) {
        if (typeof predicate == "undefined") {
            predicate = function (x) { return x };
        }
        var result = [];
        for (var i=0; i<els.length; ++i) {
            if (predicate(els[i])) {
                result.push(els[i]);
            }
        }
        return result;
    },
};

function parsePage() {
    function parseStudentContainer(c) {
        var qs = c.querySelector.bind(c);
        var data = {};

        var names = qs(".student_name").textContent.split(",");
        data.names = utils.filter(names[1].split(" ").concat(names[0].split(" ")));
        data.image = qs(".student_img img").src;
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
            return !isNaN(new Date(x))
        }

        function isDorm(x) {
            return x.match(/[\d\w]+-[\d\w]+/)
        }

        function isSuiteGroup(x) {
            return x.match(/[\d\w]+-[\d\w]+ \//)
        }

        if (isDorm(lines[0])) {
            data.dorm = lines[0];
            if (isSuiteGroup(lines[1])) {
                data.sid = lines[1];
                var addrStart = 2;
            } else {
                var addrStart = 1;
            }
        } else {
            if (isSuiteGroup(lines[0])) {
                data.sid = lines[0];
                var addrStart = 1;
            } else {
                var addrStart = 0;
            }
        }

        if (isBirthday(lines[lines.length-1])) {
            var addrEnd = lines.length-2;
            data.birthday = lines[lines.length-1];
            data.major = lines[lines.length-2];
        } else {
            var addrEnd = lines.length-1;
            data.major = lines[lines.length-1];
        }

        data.address = lines.slice(addrStart, addrEnd).join(" ")

        return data;
    }

    var students = [];
    var contrs = document.querySelectorAll(".student_container");
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
    
    // Names are normalized as their lowercase version.
    function normKey(lname) {
        // TODO: remove more stufF? hyphens?
        return lname.toLowerCase();
    }
    
    var named = {};
    for (var i=0; i<stds.length; ++i) {
        var dude = stds[i];
        var key = normKey(dude.names[dude.names.length-1]);
        if (named[key]) {
            named[key].push(dude);
        } else {
            named[key] = [dude];
        }
    }
    chrome.storage.local.clear(function() {
        chrome.storage.local.set(named, function() {
            chrome.storage.local.get(null, function (items) {
                console.log("just saved:", items)
            })
        });
    });
}

$(function () {
    console.log("Starting to parse page.");
    var students = parsePage();
    storeStudents(students);
});
