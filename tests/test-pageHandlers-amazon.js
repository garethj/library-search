/*globals require: false, exports: false */

var amazon = require("pageHandlers/amazon"),
    tabs = require("tabs");

function getCanHandlePage(hostname) {
    // We know we only use the hostname as part of a URL object when checking so
    // this is a valid enough way to test for now (ideally we'd create a real
    // URL object)
    return amazon.canHandlePage({
        hostname: hostname
    });
}

function getTitlesForUrl(url, callback) {
    tabs.open({
        url: url,
        onOpen: function (tab) {
            var handler = new amazon.Handler(tab.contentDocument);
            handler.getTitles(function (titles) {
                tab.close();
                callback(titles);
            });
        }
    });
}

function testGetTitlesForUrl(test, url, expectedTitles) {
    // Test getting titles using real pages because it's an easy way of getting
    // the kind of document we want. Pages may change which will break the tests
    // but that will break the required functionality so it's ok to pick things
    // up this way.
    test.waitUntilDone(30000);
    getTitlesForUrl(url, function (titles) {
        var i, j, matched;
        test.assertEqual(titles.length, expectedTitles.length, titles.length +
            " titles found (" + JSON.stringify(titles) + ")");
        for (i = 0; i < titles.length; i += 1) {
            matched = false;
            for (j = 0; j < expectedTitles.length; j += 1) {
                if (titles[i] === expectedTitles[j]) {
                    matched = true;
                }
            }
            if (!matched) {
                test.fail("Found an invalid title (" + titles[i] + "), " +
                    JSON.stringify(titles));
            }
        }
        test.done();
    });
}

exports.testCanHandlePage = function (test) {
    test.assertEqual(getCanHandlePage("amazon.com"), true,
        "Should handle amazon.com");
    test.assertEqual(getCanHandlePage("amazon.co.uk"), true,
        "Should handle amazon.co.uk");
    test.assertEqual(getCanHandlePage("google.com"), false,
        "Should not handle google.com");
};

exports.testGetBadScienceTitles = function (test) {
    testGetTitlesForUrl(test,
        "http://www.amazon.co.uk/Bad-Science-Ben-Goldacre/dp/000728487X/",
        ["Bad Science "]);
};

exports.testGetDragonTattooTitles = function (test) {
    testGetTitlesForUrl(test,
        "http://www.amazon.co.uk/Girl-Dragon-Tattoo-Millennium-Trilogy/dp/1847245455/", [
            "The Girl with the Dragon Tattoo (Millennium Trilogy Book 1) ",
            "The Girl with the Dragon Tattoo"
        ]);
};

exports.testGetJackReacherTitles = function (test) {
    testGetTitlesForUrl(test,
        "http://www.amazon.co.uk/61-Hours-Jack-Reacher-Novel/dp/0553825569/", [
            "61 Hours: (Jack Reacher 14) (Jack Reacher Novel) ",
            "61 Hours:",
            "61 Hours"
        ]);
};

exports.testGetPoirotTitles = function (test) {
    testGetTitlesForUrl(test,
        "http://www.amazon.co.uk/Poirot-Appointment-Death-Agatha-Christie/dp/0007119356/", [
            "Poirot - Appointment with Death ",
            "Appointment with Death "
        ]);
};
