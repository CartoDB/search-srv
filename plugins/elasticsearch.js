"use strict";

const http = require('http');
const Plugin = require('./plugin');
const requests = require('../utils/requests');


class Elasticsearch extends Plugin {
    constructor(name, host, port) {
        super(name);
        this.host = host;
        this.port = port;
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

        req.on('error', function(err) {
            console.error(err);
            callback([]);
        });

        req.write(post_data);
        req.end();
    }

    query_callback(response, callback) {
        if (response.statusCode != 200) {
            console.warn('Received status %s from %s:%s', response.statusCode, this.host, this.port);
            callback([]);
            return;
        }
        requests.get_request_body(response).then(function(body) {
            let suggestions = JSON.parse(body)['autocomplete-suggest'][0]['options'];
            let payloads = suggestions.map(function(suggestion) {
                var pl = suggestion['payload'];
                pl.score = suggestion['score'];
                return pl;
            });
            callback(payloads);
        }).catch(function(err) {
            console.error(err);
            callback([]);
        });
    }
}

module.exports = Elasticsearch
