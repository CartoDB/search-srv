"use strict";

const http = require('http');
const Plugin = require('./plugin');


class Elasticsearch extends Plugin {
    constructor() {
        super(arguments);
        this.host = arguments[0];
        this.port = arguments[1];
    }

    query(text, callback) {
        var post_data = JSON.stringify({
            'autocomplete-suggest': {
                'text': text,
                'completion': {
                    'field': 'suggest',
                    'fuzzy': false
                }
            }
        });

        var req = http.request({
            hostname: this.host,
            port: this.port,
            path: '/_suggest',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(post_data)
            }
        }, function(response) {
            this.query_callback(response, callback);
        }.bind(this));

        req.write(post_data);
        req.end();
    }

    query_callback(response, callback) {
        var body = []
        response.on('data', function(chunk) {
            body.push(chunk);
        }).on('end', function() {
            let payloads = []
            try {
                body = Buffer.concat(body).toString();
                let suggestions = JSON.parse(body)['autocomplete-suggest'][0]['options'];
                payloads = suggestions.map(function(suggestion) {
                    return suggestion['payload']
                });
            }
            catch(err) {
                console.error(err);
            }
            callback(payloads)
        }).on('error', function() {
            callback([]);
        });
    }
}

module.exports = Elasticsearch
