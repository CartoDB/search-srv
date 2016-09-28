"use strict";

var elasticsearch = require('../plugins/elasticsearch');

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


module.exports = autocompleteHandler;
