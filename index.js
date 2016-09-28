"use strict";

const http = require('http');
const requestRouter = require('./handlers/route');
const port = 8080;


var server = http.createServer(requestRouter);
server.listen(port, function() {
    console.log('Tiresias listening on port %s', port);
});
