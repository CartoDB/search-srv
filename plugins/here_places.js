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

        var sFullURL = this.request_host_full + sUrlParams;

        var _parsedRequest = parseUri(sFullURL);

        console.log("here.com _parsedRequest=", _parsedRequest, "\n\n\n");

        request(_parsedRequest.source, function (error, response, body) {
            var cache = [];
            var sResponseBody = JSON.stringify(body, function(key, value) {
                    if (typeof value === 'object' && value !== null) {
                        if (cache.indexOf(value) !== -1) {
                            // Circular reference found, discard key
                            return;
                        }
                        // Store value in our collection
                        cache.push(value);
                    }
                    return value;
            }, 2);

            // Delete me ********
            console.log('error:', error); // Print the error if one occurred
            console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
            console.log('body:', body); // Print the HTML for the here geocode response
            log.info("body=" + body);
            // *******************

            if (response.statusCode != 200) {
                var cache = [];
                log.error('ERROR: Received bad statusCode:' + response.statusCode + ',  statusMessage:'+ response.statusMessage +
                          ' responseObj:' +  sResponseBody);
                callback([]);
            } else {
                try {
                    this.query_callback(JSON.parse(body), callback);
                } catch (err) {
                    log.error("ERROR: There was an error parsing body:\n" + body);
                    log.error(err);
                }
            }
        }.bind(this));

    }

    query_callback(oBody, callback) {
        // This method will create an array of https://schema.org/Place
        var oResult = {
            "@context": "http://schema.org",
            places: []
        };

        var nLength = oBody.results.items.length;

        console.log("Received nLength=" + nLength + " items");

        var _that = this;

        oBody.results.items.forEach(function(oValue){
            console.log(oValue);

            // https://developer.here.com/rest-apis/documentation/places/topics_api/media-type-place.html
            if ( oValue.category.type === "urn:nlp-types:category" )  {
                let oNewPlace = {
                    "@type": "Place",  // https://schema.org/Place
                    "name": oValue.title,
                    "address" : {
                        "@type": "PostalAddress",  // https://schema.org/address
                        "addressLocality": oValue.vicinity
                    },
                    additionalProperty: []
                 };

                 oNewPlace.additionalProperty.push ( {
                         "@type": "PropertyValue",  // https://schema.org/PropertyValue
                         "name" : "href",
                         "url" : oValue.href
                 });

                oNewPlace.additionalProperty.push ( {
                         "@type": "PropertyValue",  // https://schema.org/PropertyValue
                         "name" : "propertyID",
                         "value" : oValue.id
                });

                if ( oValue.icon ) {
                    // This is the HERE category icon
                     oNewPlace.image = oValue.icon
                }

                if ( oValue.category ) {
                    // https://developer.here.com/rest-apis/documentation/places/topics_api/media-type-category.html
                     oNewPlace.additionalProperty.push ({
                         "@type": "PropertyValue",  // https://schema.org/PropertyValue
                         "name" : "category",
                         "description" : oValue.category.title,
                         "value": oValue.category.id,
                         "url" : oValue.category.href
                     });
                }

                if ( oValue.distance ) {
                     oNewPlace.additionalProperty.push ( {
                         "@type": "PropertyValue",  // https://schema.org/PropertyValue
                         "name" : "distance",
                         "value" : oValue.distance
                     });
                }

                // https://schema.org/GeoCoordinates
                let oGeoCordinates = {
                    "@type": "GeoCoordinates",
                    "latitude" : oValue.position[0],
                    "longitude" : oValue.position[1]
                };
                oNewPlace.geo = oGeoCordinates;

                oResult.places.push(oNewPlace);
            } else {
                log.warn("Unknown category.type" + JSON.stringify(oValue, null, 2));
                console.error( "Unknown category.type" + JSON.stringify(oValue, null, 2) );
            }
        });

        console.log("Returning oResult=" + JSON.stringify(oResult, null, 2) );

        callback(oResult);
    }
}

module.exports = HereCOM
