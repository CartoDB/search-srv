"use strict";

const http = require('http');
const Plugin = require('./plugin');
const requests = require('../utils/requests');


class Elasticsearch extends Plugin {
    constructor(name, host, port, proxy_host, proxy_port) {
        super(name);
        this.host = host;
        this.port = port;
        this.proxy_host = proxy_host || null;
        this.proxy_port = proxy_port || null;
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

        var req_meta = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(post_data)
            }
        };

        if (this.proxy_host && this.proxy_port) {
            req_meta.hostname = this.proxy_host;
            req_meta.port = this.proxy_port;
            req_meta.path = 'http://' + this.host + ':' + this.port + '/_suggest';
        }
        else {
            req_meta.hostname = this.host;
            req_meta.port = this.port;
            req_meta.path = '/_suggest';
        }

        var req = http.request(req_meta, function(response) {
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
                pl.type = 'remote';
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
