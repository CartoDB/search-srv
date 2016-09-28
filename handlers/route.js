"use strict";

const url = require('url');
const autocompleteHandler = require('./autocomplete')


var requestRouter = function(request, response) {
    console.log('Path hit: ' + request.url);
    let path  = url.parse(request.url).pathname;
    switch(path) {
        case '/ac':
            autocompleteHandler(request, response);
            break;
        default:
            response.writeHead(404, 'Invalid path');
            response.end();
    }
};

module.exports = requestRouter;
