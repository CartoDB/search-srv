"use strict";

const http = require('http');
const Plugin = require('./plugin');
const requests = require('../utils/requests');
const log = require('../utils/logging');
const log_prefix = 'Elasticsearch Plugin:';
const request = require('request');

/************************************* */
// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License
function parseUri (str) {
  var	o   = parseUri.options,
		m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
		uri = {},
		i   = 14;

	while (i--) uri[o.key[i]] = m[i] || "";

	uri[o.q.name] = {};
	uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
		if ($1) uri[o.q.name][$1] = $2;
	});

	return uri;
};

parseUri.options = {
	strictMode: false,
	key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
	q:   {
		name:   "queryKey",
		parser: /(?:^|&)([^&=]*)=?([^&]*)/g
	},
	parser: {
		strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
		loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
	}
};
/************************************* */

class HereCOM extends Plugin {
    constructor(name, app_id, app_code) {
        super(name);
        this.app_id = app_id;
        this.app_code = app_code;
        this.request_host = 'places.cit.api.here.com';
        this.request_port = 443;
        this.request_path = '/places/v1/discover/search';
        this.request_host_full = 'https://places.cit.api.here.com/places/v1/discover/search';
    }

    query(sText, callback, additional_params) {
        console.log("here.com query text=", sText, "additional_params=", additional_params);
        if ( ! additional_params.bounds ) {
            console.error("ERROR: HERE location search requires boundary boxes!");
            return;
        }

        var sUrlParams = '?in=' + additional_params.bounds + '&q=' + sText + 
                   '&app_id=' + this.app_id + '&app_code=' + this.app_code + '&tf=plain&pretty=true';
        var request_struct, request_struct2;

        var sFullDude = this.request_host_full + sUrlParams;

        var _parsedRequest = parseUri(sFullDude);

        console.log("here.com _parsedRequest=", _parsedRequest);

        var sProxy = process.env.http_proxy;

        if ( !sProxy ) {
            request_struct = {
                hostname: _parsedRequest.host,
                port: _parsedRequest.protocol === 'https' ? 443 : 80,
                path: _parsedRequest.relative,
                agent: false  // create a new agent just for this one request
            };
        } else {
            var _parsedProxy = parseUri(sProxy);
            console.log("here.com _parsedProxy=", _parsedProxy);

            var sPort;
            
            if ( _parsedProxy.port.length > 0 ) {
                sPort = _parsedProxy.port;
            } else if (_parsedProxy.protocol === 'http') {
                sPort = 80;
            } else if (_parsedProxy.protocol === 'https') {
                sPort = 443;
             } else {
                throw new Error("ERROR: Bad proxy settins=" + sProxy);
            }

            request_struct = {
                hostname: _parsedProxy.host,
                //port: this.request_host.startsWith("https") ? 443 : 80,
                port: sPort  ,
                path: _parsedRequest.source,
                agent: false  // create a new agent just for this one request
            };

            request_struct2 = {
                host: _parsedProxy.host,
                port: sPort,
                method: 'GET',
                path: _parsedRequest.source
            };
        }


        console.log("here.com request_struct=", request_struct);
        console.log("here.com request_struct2=", request_struct2);
        var sRequestStruct = JSON.stringify(request_struct, null,2);
        var sRequestStruct2 = JSON.stringify(request_struct2, null,2);

        log.error("sRequestStruct2:" + sRequestStruct2);

        request(_parsedRequest.source, function (error, response, body) {
            console.log('error:', error); // Print the error if one occurred
            console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
            console.log('body:', body); // Print the HTML for the Google homepage.
        });

        var req = http.request(request_struct2, function(response) {
            if ( response && response.statusCode != 200 ) {
                log.error("ERROR: Request error. Structure was:" + request_struct2);
            }

            console.log("here.com request_struct2 response=", response);
            this.query_callback(response, callback);
        }.bind(this));


/*        var req = http.get(request_struct, function(response) {
            if ( response && response.statusCode != 200 ) {
                log.error("ERROR: Request error. Structure was:" + sRequestStruct);
            }

            console.log("here.com response=", response);
            this.query_callback(response, callback);
        }.bind(this));
*/
        req.on('error', function(err) {
            log.error(err);
            callback([]);
        });
    }

    query_callback(response, callback) {
        if (response.statusCode != 200) {
            var cache = [];
            log.warn('ERROR: Received statusCode:' + response.statusCode + ',  statusMessage:'+ response.statusMessage +
               ' responseObj:' +  JSON.stringify(response, function(key, value) {
                    if (typeof value === 'object' && value !== null) {
                        if (cache.indexOf(value) !== -1) {
                            // Circular reference found, discard key
                            return;
                        }
                        // Store value in our collection
                        cache.push(value);
                    }
                    return value;
            },2));

            callback([]);
            return;
        }
        requests.get_request_body(response).then(function(body) {
            let suggestions = JSON.parse(body)['hits']['hits'];
            let payloads = suggestions.map(function(suggestion) {
                var pl = {};
                pl.data = suggestion._source.data;
                pl.id = suggestion._source.id;
                pl.dataset = suggestion._source.dataset;
                pl.is_dataset = false;
                pl.score = suggestion._score;
                return pl;
            });
            callback(payloads);
        }).catch(function(err) {
            log.error(err);
            callback([]);
        });
    }
}

module.exports = HereCOM
