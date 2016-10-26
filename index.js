"use strict";

var args = process.argv.slice(2);
const port = args[0];
const log_file = args[1];
const config_file = args[2];

const config = require('./utils/config');
const log = require('./utils/logging');

log.set_log_file(log_file);
config.set_config_file(config_file);

const http = require('http');
const requestRouter = require('./handlers/route');


var server = http.createServer(requestRouter);
server.listen(port, function() {
    log.info('Search-srv listening on port ' + port);
});
