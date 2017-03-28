"use strict";

/* Makes calls to 
 * https://developer.here.com/rest-apis/documentation/places/topics_api/resource-search.html
 */

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
        this.request_host_full = 'https://places.cit.api.here.com/places/v1/discover/search';
    }

    query(sText, callback, additional_params) {
        console.log("here_laces query text=", sText, "additional_params=", additional_params);
        if ( ! (additional_params && (additional_params.bounds || additional_params.center) ) ) {
            console.error("ERROR: here_places search requires boundary boxes or a center point!");
            let oResult = {
                "@context": "http://schema.org",
                places: [{
                    "@type": "error",  // https://schema.org/error
                    "name": 404,
                    "description": "ERROR: here_places search requires boundary boxes or a center point!" +  (new Error()).stack.split('\n').slice(1,2)

                }]
            };
            callback(oResult);
            return;
        }

        var sUrlParams;

        if ( additional_params.bounds ) {
            sUrlParams = '?in=' + additional_params.bounds + '&q=' + sText + 
                   '&app_id=' + this.app_id + '&app_code=' + this.app_code + '&tf=plain&pretty=true';
        } else {
            sUrlParams = '?at=' + additional_params.center + '&q=' + sText + 
                   '&app_id=' + this.app_id + '&app_code=' + this.app_code + '&tf=plain&pretty=true';
        }

        var sFullURL = this.request_host_full + sUrlParams;

        var _parsedRequest = parseUri(sFullURL);

        console.log("here_places _parsedRequest=", _parsedRequest, "\n\n\n");

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
            console.log('here_places error:', error); // Print the error if one occurred
            console.log('here_places statusCode:', response && response.statusCode); // Print the response status code if a response was received
            console.log('here_places body:', body); // Print the HTML for the here geocode response
            log.info("here_places body=" + body);
            // *******************

            if (response.statusCode != 200) {
                var cache = [];
                log.error('ERROR: here_places received bad statusCode:' + response.statusCode + ',  statusMessage:'+ 
                          ' responseObj:' +  sResponseBody);

                var oResult = {
                  "@context": "http://schema.org",
                  places: [{
                      "@type": "error",  // https://schema.org/Place
                      "name": response.statusCode,
                      "description": sResponseBody
                    }
                  ]
                };
                callback(oResult);
            } else {
                try {
                    this.query_callback(JSON.parse(body), callback);
                } catch (err) {
                    log.error("ERROR: here_places there was an error parsing body:\n" + body);
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
                    additionalProperty: []
                 };

                 if ( oValue.vicinity ) {
                     oNewPlace.address = {
                        "@type": "PostalAddress",  // https://schema.org/address
                        "addressLocality": oValue.vicinity
                     }
                 }

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
                         "url" : oValue.category.href,
                         "alternateName" : oValue.category.type
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
