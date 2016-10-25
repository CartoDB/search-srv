"use strict";

const url = require('url');
const autocompleteHandler = require('./autocomplete');
const refreshHandler = require('./refresh');
const log = require('../utils/logging');


var requestRouter = function(request, response) {
    log.info('Path hit: ' + request.url);
    let path  = url.parse(request.url).pathname;
    switch(path) {
        case '/search-srv-ac':
            autocompleteHandler(request, response);
            break;
        case '/search-srv-refresh':
            refreshHandler(request, response);
            break;
        case '/search-srv-health':
            response.end('Hello');
            break;
        default:
            response.writeHead(404, 'Invalid path');
            response.end();
    }
};

module.exports = requestRouter;
