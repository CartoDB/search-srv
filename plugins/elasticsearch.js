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
            'query': {
                'multi_match': {
                    'query': text,
                    'type': 'phrase_prefix',
                    'fields': ['meta.name', 'meta.category', 'meta.locations', 'meta.tags']
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
            req_meta.path = 'http://' + this.host + ':' + this.port + '/demo/resource/_search';
        }
        else {
            req_meta.hostname = this.host;
            req_meta.port = this.port;
            req_meta.path = '/demo/resource/_search';
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
            let suggestions = JSON.parse(body)['hits']['hits'];
            let payloads = suggestions.map(function(suggestion) {
                var pl = {};
                pl.data = suggestion._source.data;
                pl.origin = suggestion._source.origin;
                pl.primary_key = suggestion._source.primary_key;
                pl.location = suggestion._source.location;
                pl.id = suggestion._source.id;
                pl.dataset = suggestion._source.dataset;
                pl.score = suggestion._score;
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
