/*globals exports: false */

exports.canHandlePage = function (location) {
    // Only check for "amazon" in URL hostname
    // (not a very reliable check but good enough)
    return location.hostname && (location.hostname.indexOf("amazon") !== -1);
};

exports.Handler = function (document) {
    this.document = document;
};

exports.Handler.prototype.getTitles = function (callback) {
    var title, titles, index,
        // Get the title from the expected HTML element
        titleElement = this.document.getElementById("btAsinTitle");
    if (titleElement && titleElement.firstChild) {
        title = titleElement.firstChild.textContent;
        titles = [title];
        // Some books will include extra information in the title that will not
        // match the library site so try multiple titles for matches (this is
        // really inefficient as it will result in many HTTP calls)
        if ((index = title.indexOf(":")) !== -1) {
            // e.g. "61 Hours: (Jack Reacher 14)" -> "61 Hours"
            titles.push(title.substr(0, index));
        }
        if ((index = title.indexOf(" (")) !== -1) {
            // e.g. "The Girl with the Dragon Tattoo (Millennium Trilogy)" ->
            //          "The Girl with the Dragon Tattoo"
            titles.push(title.substr(0, index));
        }
        if ((index = title.indexOf(" - ")) !== -1) {
            // e.g. "Poirot - Murder in the Mews" -> "Murder in the Mews"
            titles.push(title.substr(index + 3));
        }
    }
    callback(titles);
};

exports.Handler.prototype.searchStarted = function () {
    // Add a notice to the page to show that the search is in progress
    var titleElement = this.document.getElementById("btAsinTitle");
    if (titleElement) {
        this.notificationElement = this.document.createElement("span");
        this.notificationElement.innerHTML = "Checking for library books...";
        titleElement.parentNode.parentNode.appendChild(this.notificationElement);
    }
};

exports.Handler.prototype.searchCompleted = function (results) {
    // Add a new element to the page containing a link to the library URL
    var i, urlListElement, urlElement;
    if (results.length > 0) {
        this.notificationElement.innerHTML = "";
        urlListElement = this.document.createElement("ul");
        for (i = 0; i < results.length; i += 1) {
            urlElement = this.document.createElement("span");
            urlElement.innerHTML =
                results[i].library + ": <a href=\"" + results[i].url + "\">" +
                results[i].title + "</a>";
            urlListElement.appendChild(urlElement);
        }
        this.notificationElement.appendChild(urlListElement);
    } else {
        this.notificationElement.innerHTML =
            "Could not find matching library books";
    }
};
