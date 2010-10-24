/*globals require: false */
(function () {

    var tabs = require("tabs"),
        request = require("request"),
        libraryUrlElement;

    function getBookTitleFromCurrentPage(tab) {
        var url = tab.location,
            titleElement, title;
        // Only check Amazon page (not a very reliable check but good enough)
        if (url.hostname && url.hostname.indexOf("amazon")) {
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

    function validateLibraryUrl(url, callback) {
        console.log("Validating " + url);
        // Validate a library URL by simply checking for a known string that is
        // displayed if the book is not available. Ideally we would have an API
        // for this but it does the job.
        request.Request({
            url: url,
            onComplete: function (response) {
                console.log("Response for " + url);
                var valid = response.text.indexOf(
                        "We're sorry, but the selected title is not available")
                        === -1;
                callback(valid);
            }
        }).get();
    }

    function validateLibraryUrls(urls, callback) {
        var i,
            validatedUrls = 0,
            newUrlList = [];

        // Function to create a validator function used in the following loop.
        // Created here rather than in the loop to save creating a function
        // on every iteration and to reduce confusion over variable scope.
        function makeUrlValidator(url) {
            return function () {
                validateLibraryUrl(url, function (valid) {
                    if (valid) {
                        newUrlList.push(url);
                    }
                    validatedUrls += 1;
                    if (validatedUrls === urls.length) {
                        callback(newUrlList);
                    }
                });
            };
        }

        for (i = 0; i < urls.length; i += 1) {
            console.log("1Validating " + urls[i]);
            (makeUrlValidator(urls[i])());
        }
    }

    function getPossibleLibraryUrlsForBook(title, callback) {
        // Use the Open Library API (http://openlibrary.org/dev/docs/restful_api)
        // to determine the OverDrive ID (OverDrive powers the library site)
        console.log("checking title " + title);
        request.Request({
            url: "http://openlibrary.org/query.json?" +
                "type=/type/edition&physical_format=&identifiers=&title=" +
                title,
            onComplete: function (response) {
                var urls = [],
                    books = response.json,
                    i, bookId, url;
                for (i = 0; i < books.length; i += 1) {
                    if (books[i].physical_format === "eBook" &&
                        books[i].identifiers &&
                        books[i].identifiers.overdrive &&
                        books[i].identifiers.overdrive.length > 0) {
                        bookId = books[i].identifiers.overdrive[0];
                        url = getLibraryUrlFromOverDriveId(bookId);
                        urls.push(url);
                        console.log("Unvalidated url " + url);
                    }
                }
                // We have a list of URLs but the library may still not stock
                // these books
                validateLibraryUrls(urls, function (updatedUrlList) {
                    callback(updatedUrlList);
                });
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
