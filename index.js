"use strict";

const http = require('http');
const url = require('url');
const PORT = 8080;

var elasticsearch = require('./plugins/elasticsearch');

const plugins = [new elasticsearch('100.70.21.91', '8080')]

var autocompleteHandler = function(request, response) {
    var callback = function(options) {
        response.end(JSON.stringify(options));
    }
    var body = [];
    request.on('data', function(chunk) {
        body.push(chunk);
    }).on('end', function() {
        body = Buffer.concat(body).toString();
        let text = JSON.parse(body)['text']
        for (var idx in plugins) {
            plugins[idx].query(text, callback)
        }
    });
};


var requestHandler = function(request, response) {
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


var server = http.createServer(requestHandler);
server.listen(PORT, function() {
    console.log('Tiresias listening on port %s', PORT);
});
