/*globals require: false, exports: false */

var hampshire = require("libraries/hampshire");

function testSearch(test, titles, expectedMatch) {
    test.waitUntilDone(30000);
    hampshire.search(titles, function (results) {
        var i,
            match = false;
        for (i = 0; i < results.length; i += 1) {
            if (results[i].url === expectedMatch.url) {
                test.assertEqual(results[i].title, expectedMatch.title,
                    "Book title: " + results[i].title);
                test.assertEqual(results[i].library, expectedMatch.library,
                    "Library: " + results[i].title);
                test.assertEqual(results[i].libraryUrl,
                    expectedMatch.libraryUrl, "Library URL: " +
                    results[i].title);
                match = true;
            }
        }
        test.assertEqual(match, true, "Match not found: " +
            JSON.stringify(results));
        test.done();
    });
}

exports.testBadScienceSearch = function (test) {
    testSearch(test, [
        "Bad Science"
    ], {
        url: "http://hampshirelibrary.lib.overdrive.com/ContentDetails.htm?ID=E6646D8D-36F5-4559-A432-FED87AF6860B",
        title: "Bad Science",
        library: "Hampshire Digital Library",
        libraryUrl: "http://hampshirelibrary.lib.overdrive.com/"
    });
};

/*
Unfortunately this test doesn't work because the OpenLibrary returns an
OverDrive match but with a different identifier to the one in the Hampshire
Library - looks like there's two different versions and OpenLibrary only has
one of them.

exports.testDragonTattooSearch = function (test) {
    testSearch(test, [
        "The Girl with the Dragon Tattoo (Millennium Trilogy Book 1) ",
        "The Girl with the Dragon Tattoo"
    ], {
        url: "http://hampshirelibrary.lib.overdrive.com/ContentDetails.htm?ID=FF1A6487-CD63-48E5-925B-51E192EE6E75",
        title: "The Girl with the Dragon Tattoo",
        library: "Hampshire Digital Library",
        libraryUrl: "http://hampshirelibrary.lib.overdrive.com/"
    });
};
*/

exports.testPoirotSearch = function (test) {
    testSearch(test, [
        "Poirot - Appointment with Death ",
        "Appointment with Death "
    ], {
        url: "http://hampshirelibrary.lib.overdrive.com/ContentDetails.htm?ID=A971DB75-21AD-4C86-9C91-52BB42071AAC",
        title: "Appointment with Death ",
        library: "Hampshire Digital Library",
        libraryUrl: "http://hampshirelibrary.lib.overdrive.com/"
    });
};
