"use strict";

const requests = require('../utils/requests');
var elasticsearch = require('../plugins/elasticsearch');

const REQUEST_TIMEOUT_MS = 10
const plugins = [new elasticsearch('clayton-elasticsearch', '100.70.21.91', '8080')]


class AutoComplete {
    constructor(request, response) {
        this.request = request;
        this.response = response;
    }

    process_request() {
        var self = this;
        requests.get_request_body(this.request).then(function(body) {
            self.distribute_request(body);
        }).catch(function(err) {
            self.error(err);
        });
    }

    distribute_request(body) {
        let promises = [];
        let text = JSON.parse(body)['text'];
        for (var idx in plugins) {
            promises.push(new Promise(function(resolve, reject) {
                plugins[idx].query(text, resolve);
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
        for(var idx in plugins) {
            obj[plugins[idx].name] = values[idx];
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
