"use strict";

const config = require('./utils/config');
const http = require('http');
const requestRouter = require('./handlers/route');
const port = 8008;


var server = http.createServer(requestRouter);
server.listen(port, function() {
    console.log('Tiresias listening on port %s', port);
});
