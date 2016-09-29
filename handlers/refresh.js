var config = require('../utils/config');

var refreshHandler = function(request, response) {
    config.refresh();
    response.end('ok');
};


module.exports = refreshHandler;
