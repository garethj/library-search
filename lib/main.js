/*globals require: false, console: false */
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

    function getBookTitlePossibilities(title) {
        var titles = [title],
            index;
        // Some books will include extra information in the title that will not
        // match the library site (e.g. the series name in brackets or after a
        // colon) so try multiple titles for matches
        if ((index = title.indexOf(":")) !== -1) {
            titles.push(title.substr(0, index));
        }
        if ((index = title.indexOf(" (")) !== -1) {
            titles.push(title.substr(0, index));
        }
        return titles;
    }

    function getLibraryUrlFromOverDriveId(id) {
        return "http://hampshirelibrary.lib.overdrive.com/ContentDetails.htm?" +
            "ID=" + id;
    }

    function validateLibraryUrl(url, callback) {
        // Validate a library URL by simply checking for a known string that is
        // displayed if the book is not available. Ideally we would have an API
        // for this but it does the job.
        console.log("Validating book at " + url);
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
                    console.log("Validated (" + valid + ") URL " + url);
                    validatedUrls += 1;
                    if (validatedUrls === urls.length) {
                        callback(newUrlList);
                    }
                });
            };
        }

        if (urls.length > 0) {
            for (i = 0; i < urls.length; i += 1) {
                (makeUrlValidator(urls[i])());
            }
        } else {
            callback(urls);
        }
    }

    function getPossibleLibraryUrlsForBookTitle(title, callback) {
        console.log("Searching for book \"" + title + "\"");
        // Use the Open Library API
        // (http://openlibrary.org/dev/docs/restful_api) to determine the
        // OverDrive ID (OverDrive powers the library site)
        request.Request({
            url: "http://openlibrary.org/query.json?" +
                "type=/type/edition&physical_format=&identifiers=" +
                "&title=" + title,
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
                        console.log("Found matching book with OverDrive ID " +
                            bookId);
                        url = getLibraryUrlFromOverDriveId(bookId);
                        urls.push(url);
                    }
                }
                callback(urls);
            }
        }).get();
    }

    function getPossibleLibraryUrlsForBook(title, callback) {
        var titles = getBookTitlePossibilities(title),
            index,
            titlesChecked = 0;

        // Function to create a URL retriever function used in the following
        // loop. Created here rather than in the loop to save creating a
        // function on every iteration and to reduce confusion over variable
        // scope.
        function makeUrlRetriever(currentTitle) {
            return function () {
                getPossibleLibraryUrlsForBookTitle(currentTitle,
                    function (urls) {
                        // We have a list of URLs but the library may still not
                        // stock these books
                        validateLibraryUrls(urls, function (updatedUrlList) {
                            titlesChecked += 1;
                            if (titlesChecked === titles.length) {
                                callback(updatedUrlList);
                            }
                        });
                    });
            };
        }

        for (index = 0; index < titles.length; index += 1) {
            (makeUrlRetriever(titles[index])());
        }
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
            libraryUrlElement.innerHTML =
                "Could not find matching library books";
        }
    }

    // Start this process when a page has loaded
    tabs.onReady.add(function (tab) {
        var bookTitle = getBookTitleFromCurrentPage(tab);
        if (bookTitle) {
            console.log("Book title found: \"" + bookTitle + "\"");
            addLoadingNoticeToPage(tab);
            getPossibleLibraryUrlsForBook(bookTitle, function (libraryUrls) {
                console.log(libraryUrls.length + " library books found");
                addUrlsToPage(libraryUrls, tab);
            });
        }
    });

}());
