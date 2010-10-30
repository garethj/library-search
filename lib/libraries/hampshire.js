/*globals exports: false, require: false */

var request = require("request");

function getLibraryUrlFromOverDriveId(id) {
    return "http://hampshirelibrary.lib.overdrive.com/ContentDetails.htm?ID=" +
        id;
}

function validateLibraryUrl(url, callback) {
    // Validate a library URL by simply checking for a known string that is
    // displayed if the book is not available. Ideally we would have an API for
    // this but it does the job.
    request.Request({
        url: url,
        onComplete: function (response) {
            var valid = response.text.indexOf(
                "We're sorry, but the selected title is not available") ===
                -1;
            callback(valid);
        }
    }).get();
}

function validateBooks(books, callback) {
    var validBooks = [],
        validatedBooks = 0,
        i;

    function makeBookValidator(book) {
        return function () {
            validateLibraryUrl(book.url, function (isValid) {
                if (isValid) {
                    validBooks.push(book);
                }
                validatedBooks += 1;
                if (validatedBooks === books.length) {
                    callback(validBooks);
                }
            });
        };
    }

    for (i = 0; i < books.length; i += 1) {
        (makeBookValidator(books[i])());
    }
}

function getBookDetailsFromOverDriveResponse(title, response, callback) {
    var books = [],
        overDriveBooks = response.json,
        i, bookId;
    for (i = 0; overDriveBooks && i < overDriveBooks.length; i += 1) {
        if ((overDriveBooks[i].physical_format === "eBook" ||
             overDriveBooks[i].physical_format === "electronic resource") &&
            overDriveBooks[i].identifiers &&
            overDriveBooks[i].identifiers.overdrive &&
            overDriveBooks[i].identifiers.overdrive.length > 0) {
            bookId = overDriveBooks[i].identifiers.overdrive[0];
            books.push({
                url: getLibraryUrlFromOverDriveId(bookId),
                title: title,
                library: "Hampshire Digital Library",
                libraryUrl: "http://hampshirelibrary.lib.overdrive.com/"
            });
        }
    }
    if (books.length > 0) {
        validateBooks(books, function (validBooks) {
            callback(validBooks);
        });
    } else {
        callback(books);
    }
}

function searchForTitle(title, callback) {
    // Use the Open Library API (http://openlibrary.org/dev/docs/restful_api)
    // to determine the OverDrive ID (OverDrive powers the library site)
    request.Request({
        url: "http://openlibrary.org/query.json?" +
            "type=/type/edition&physical_format=&identifiers=" +
            "&title=" + title,
        onComplete: function (response) {
            getBookDetailsFromOverDriveResponse(title, response, callback);
        }
    }).get();
}

exports.search = function (titles, callback) {
    var titlesChecked = 0,
        books = [],
        i;
    function makeTitleSearcher(title) {
        return function () {
            searchForTitle(title, function (results) {
                books = books.concat(results);
                titlesChecked += 1;
                if (titlesChecked === titles.length) {
                    callback(results);
                }
            });
        };
    }
    for (i = 0; i < titles.length; i += 1) {
        (makeTitleSearcher(titles[i])());
    }
};
