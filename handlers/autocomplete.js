"use strict";

const requests = require('../utils/requests');
const REQUEST_TIMEOUT_MS = 10

var config = require('../utils/config');


class AutoComplete {
    constructor(request, response) {
        this.request = request;
        this.response = response;
        this.plugins = [];
    }

    process_request() {
        this.store_plugins();
        var self = this;
        requests.get_request_body(this.request).then(function(body) {
            self.distribute_request(body);
        }).catch(function(err) {
            self.error(err);
        });
    }

    store_plugins() {
        this.plugins = config.get_plugins();
    }

    distribute_request(body) {
        let promises = [];
        let text = JSON.parse(body)['text'];
        var self = this;
        for (var idx in this.plugins) {
            promises.push(new Promise(function(resolve, reject) {
                self.plugins[idx].query(text, resolve);
                setTimeout(resolve, REQUEST_TIMEOUT_MS, []);
            }));
        }

        var self = this;
        Promise.all(promises).then(function(values) {
            self.write_response_options(values);
        }).catch(function(err) {
            self.error(err);
        });
    }

    write_response_options(values) {
        let obj = {};
        for(var idx in this.plugins) {
            obj[this.plugins[idx].name] = values[idx];
        }
        this.response.end(JSON.stringify(obj));
    }

    error(err) {
        console.error(err);
        this.response.end('[]');
    }
}

var autocompleteHandler = function(request, response) {
    let ac = new AutoComplete(request, response);
    ac.process_request();
};


module.exports = autocompleteHandler;
