"use strict";

var get_request_body = function(request) {
    var p = new Promise(function(resolve, reject) {
        var body = [];
        request.on('data', function(chunk) {
            body.push(chunk);
        }).on('end', function() {
            body = Buffer.concat(body).toString();
            resolve(body);
        }).on('error', reject);
    });
    return p;
};


exports.get_request_body = get_request_body
