"use strict";

const url = require('url');
const autocompleteHandler = require('./autocomplete');
const refreshHandler = require('./refresh');


var requestRouter = function(request, response) {
    console.log('Path hit: ' + request.url);
    let path  = url.parse(request.url).pathname;
    switch(path) {
        case '/ac':
            autocompleteHandler(request, response);
            break;
        case '/refresh':
            refreshHandler(request, response);
        default:
            response.writeHead(404, 'Invalid path');
            response.end();
    }
};

module.exports = requestRouter;
