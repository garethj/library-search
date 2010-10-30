// TODO
// - Handle failures better, e.g. retry if OpenLibrary API fails and at least
//   report to user
// - Do search on pages listing books too (if not too many HTTP requests)

/*globals require: false */

var tabs = require("tabs");

function searchLibrary(library, titles, pageHandler) {
    library.search(titles, function (results) {
        pageHandler.searchCompleted(results);
    });
}

function searchLibraries(pageHandler, libraries) {
    var i;
    pageHandler.getTitles(function (titles) {
        if (titles && titles.length > 0) {
            for (i = 0; i < libraries.length; i += 1) {
                searchLibrary(libraries[i], titles, pageHandler);
            }
        }
    });
}

// Start this process when a page has loaded
tabs.onReady.add(function (tab) {
    var pageHandlers = [ require("pageHandlers/amazon") ],
        libraries = [ require("libraries/hampshire") ],
        pageHandler, i;
    for (i = 0; i < pageHandlers.length; i += 1) {
        if (pageHandlers[i].canHandlePage(tab.location)) {
            pageHandler = new pageHandlers[i].Handler(tab.contentDocument);
            pageHandler.searchStarted();
            searchLibraries(pageHandler, libraries);
        }
    }
});
