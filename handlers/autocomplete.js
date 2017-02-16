"use strict";

const requests = require('../utils/requests');
const log = require('../utils/logging');
const log_prefix = 'Autocomplete Handler:';

var config = require('../utils/config');


class AutoComplete {
    constructor(request, response) {
        this.request = request;
        this.response = response;
        this.plugins = [];
    }

    process_request() {
        this.response.setHeader('Access-Control-Allow-Origin', '*');
        var self = this;
        requests.get_request_body(this.request).then(function(body) {
            self.distribute_request(body);
        }).catch(function(err) {
            self.error(err);
        });
    }

    store_plugins(names) {
        this.plugins = [];
        var all_plugins = config.get_plugins();
        if (typeof names === 'undefined') {
            for (var key in all_plugins) {
                if (all_plugins.hasOwnProperty(key)) {
                    this.plugins.push(all_plugins[key]);
                }
            }
        }
        else {
            for (var idx in names) {
                if (all_plugins.hasOwnProperty(names[idx])) {
                    this.plugins.push(all_plugins[names[idx]]);
                }
                else {
                    log.warn(log_prefix + 'No plugin found with name ' + names[idx]);
                }
            }
        }
    }

    distribute_request(body) {
        try {
            var promises = [];
            var request_json = JSON.parse(body);
            this.store_plugins(request_json['services']);
            var text = request_json['text'];
            var additional_params = request_json['params'] || {};
            var timeout = config.get_timeout();
            var self = this;
            for (var idx in this.plugins) {
                promises.push(new Promise(function(resolve, reject) {
                    self.plugins[idx].query(text, resolve, additional_params[self.plugins[idx].name]);
                    setTimeout(resolve, timeout, []);
                }));
            }

            var self = this;
            Promise.all(promises).then(function(values) {
                self.write_response_options(values);
            }).catch(function(err) {
                self.error(err);
            });
        }
        catch(err) {
            this.error(err);
        }
    }

    write_response_options(values) {
        var obj = {};
        for(var idx in this.plugins) {
            obj[this.plugins[idx].name] = values[idx];
        }
        this.response.end(JSON.stringify(obj));
    }

    error(err) {
        log.error(log_prefix + err);
        this.response.end('{}');
    }
}

var autocompleteHandler = function(request, response) {
    var ac = new AutoComplete(request, response);
    ac.process_request();
};


module.exports = autocompleteHandler;
