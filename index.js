"use strict";

const config = require('./utils/config');
const http = require('http');
const log = require('./utils/logging');
const requestRouter = require('./handlers/route');
const port = 8008;


var server = http.createServer(requestRouter);
server.listen(port, function() {
    log.info('Search-srv listening on port ' + port);
});
