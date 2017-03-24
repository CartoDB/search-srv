"use strict";

/* Makes calls to 
 * https://developer.here.com/rest-apis/documentation/places/topics_api/resource-autosuggest.html
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

class HereCOMSuggestions extends Plugin {
    constructor(name, app_id, app_code) {
        super(name);
        this.app_id = app_id;
        this.app_code = app_code;
        this.request_host_full = 'https://places.cit.api.here.com/places/v1/autosuggest';
    }

    query(sText, callback, additional_params) {
        console.log("here.com query text=", sText, "additional_params=", additional_params);
        if ( ! (additional_params && (additional_params.bounds || additional_params.center) ) ) {
            console.error("ERROR: here_suggestions search requires boundary boxes or a center point!");
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
            log.info("here_suggestions body=" + body);
            // *******************

            if (response.statusCode != 200) {
                var cache = [];
                log.error('ERROR: Received bad statusCode:' + response.statusCode + ',  statusMessage:'+ response.statusMessage +
                          ' responseObj:' +  sResponseBody);

                var oResult = {
                  "@context": "http://schema.org",
                  places: [{
                      "@type": "error",  // https://schema.org/error
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

        var nLength = oBody.results.length;

        console.log("Received nLength=" + nLength + " items");

        var _that = this;

        oBody.results.forEach(function(oValue){
            console.log(oValue);

            // https://developer.here.com/rest-apis/documentation/places/topics_api/media-type-place.html
            if ( oValue.type === "urn:nlp-types:place" )  {
                let oNewPlace = {
                    "@type": "Place",  // https://schema.org/Place
                    "name": oValue.title,
                    "description": oValue.highlightedTitle,
                    additionalProperty: [{
                         "@type": "PropertyValue",  // https://schema.org/PropertyValue
                         "name" : "category",
                         "value": oValue.type
                    }]
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

                if ( oValue.position ) {
                    // https://schema.org/GeoCoordinates
                    let oGeoCordinates = {
                        "@type": "GeoCoordinates",
                        "latitude" : oValue.position[0],
                        "longitude" : oValue.position[1]
                    };
                    oNewPlace.geo = oGeoCordinates;
                }

                if ( oValue.bbox ) {
                    let sCoordinates = oValue.bbox[1] + "," + oValue.bbox[0] + " " + oValue.bbox[3] + "," + oValue.bbox[2]
                    oNewPlace.additionalProperty.push ( {
                            "@type": "GeoShape",  // https://schema.org/GeoShape
                            "box" : sCoordinates  // https://schema.org/box
                    });
                }

                oResult.places.push(oNewPlace);
            } else if ( oValue.type === "urn:nlp-types:autosuggest" )  {
                // https://developer.here.com/rest-apis/documentation/places/topics_api/media-type-autosuggest.html
                let oNewPlace = {
                    "@type": "Place",  // https://schema.org/Place
                    "name": oValue.title,
                    "description": oValue.highlightedTitle,
                    additionalProperty: [{
                         "@type": "PropertyValue",  // https://schema.org/PropertyValue
                         "name" : "category",
                         "value": oValue.type
                     },{
                         "@type": "PropertyValue",  // https://schema.org/PropertyValue
                         "name" : "completion",
                         "value": oValue.completion
                    },{
                         "@type": "PropertyValue",  // https://schema.org/PropertyValue
                         "name" : "href",
                         "url" : oValue.href
                    }]
                 };

            } else {
                log.warn("Unknown category.type" + JSON.stringify(oValue, null, 2));
                console.error( "Unknown type" + JSON.stringify(oValue, null, 2) );
            }
        });

        console.log("Returning oResult=" + JSON.stringify(oResult, null, 2) );

        callback(oResult);
    }
}

module.exports = HereCOMSuggestions
