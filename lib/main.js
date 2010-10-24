/*globals require: false */
(function () {

    var tabs = require("tabs"),
        libraryUrlElement;

    function getBookTitleFromCurrentPage(tab) {
        var url = tab.location,
            titleElement, title;
        // Only check Amazon page (not a very reliable check but good enough)
        if (url.hostname.indexOf("amazon")) {
            // Get the title from the expected HTML element
            titleElement = tab.contentDocument.getElementById("btAsinTitle");
            if (titleElement && titleElement.firstChild) {
                title = titleElement.firstChild.textContent;
            }
        }
        return title;
    }

    function getLibraryUrlFromOverDriveId(id) {
        return "http://hampshirelibrary.lib.overdrive.com/ContentDetails.htm?" +
            "ID=" + id;
    }

    function getPossibleLibraryUrlsForBook(title, callback) {
        var request = require("request");
        // Use the Open Library API (http://openlibrary.org/dev/docs/restful_api)
        // to determine the OverDrive ID (OverDrive powers the library site)
        request.Request({
            url: "http://openlibrary.org/query.json?" +
                "type=/type/edition&physical_format=&identifiers=&title=" +
                title,
            onComplete: function (response) {
                var urls = [],
                    books = response.json,
                    i, bookId, url;
                for (i = 0; i < books.length; i += 1) {
                    if ((books[i].physical_format === "eBook" ||
                         books[i].physical_format === "electronic resource") &&
                        books[i].identifiers &&
                        books[i].identifiers.overdrive &&
                        books[i].identifiers.overdrive.length > 0) {
                        bookId = books[i].identifiers.overdrive[0];
                        url = getLibraryUrlFromOverDriveId(bookId);
                        urls.push(url);
                    }
                }
                callback(urls);
            }
        }).get();
    }

    function addLoadingNoticeToPage(tab) {
        var titleElement = tab.contentDocument.getElementById("btAsinTitle");
        libraryUrlElement = tab.contentDocument.createElement("span");
        libraryUrlElement.innerHTML = "Checking for library books...";
        titleElement.parentNode.parentNode.appendChild(libraryUrlElement);
    }

    function addUrlsToPage(libraryUrls, tab) {
        // Add a new element to the page containing a link to the library URL
        var i, urlListElement, urlElement;
        if (libraryUrls.length > 0) {
            libraryUrlElement.innerHTML = "";
            urlListElement = tab.contentDocument.createElement("ul");
            for (i = 0; i < libraryUrls.length; i += 1) {
                urlElement = tab.contentDocument.createElement("span");
                urlElement.innerHTML = "<a href=\"" + libraryUrls[i] + "\">" +
                    "Hampshire Digital Library version</a>";
                urlListElement.appendChild(urlElement);
            }
            libraryUrlElement.appendChild(urlListElement);
        } else {
            libraryUrlElement.innerHTML = "Could not find matching library books";
        }
    }

    tabs.onReady.add(function (tab) {
        var bookTitle = getBookTitleFromCurrentPage(tab);
        if (bookTitle) {
            addLoadingNoticeToPage(tab);
            getPossibleLibraryUrlsForBook(bookTitle, function (libraryUrls) {
                addUrlsToPage(libraryUrls, tab);
            });
        }
    });

}());
