"use strict";

const fs = require('fs');
const log = require('./logging.js');
const log_prefix = 'Config Util:'


class Config {
    constructor() {
        this.plugins = {};
        this.plugins_rollback = {};
        this.timeout = 0;
        this.config_file = null;
    }

    read() {
        try {
            this.plugins_rollback = this.plugins;
            this.plugins = {};
            let contents = fs.readFileSync(this.config_file);
            let config = JSON.parse(contents);
            for (var idx in config['plugins']) {
                let cls = require('../plugins/' + config['plugins'][idx]['type']);
                this.plugins[config['plugins'][idx]['arguments'][0]] = (new (
                    Function.prototype.bind.apply(cls, [null].concat(config['plugins'][idx]['arguments']))
                ));
            }
            this.timeout = config['timeout'];
        }
        catch(err) {
            this.plugins = this.plugins_rollback;
            this.plugins_rollback = {};
            this.error(err);
        }
    }

    set_config_file(filename) {
        this.config_file = filename;
        log.info(log_prefix + 'Config file was set to "' + filename + '"');
        this.read();
    }

    refresh() {
        this.read();
    }

    get_plugins() {
        return this.plugins;
    }

    get_timeout() {
        return this.timeout;
    }

    error(err) {
        log.error(err);
    }
}


module.exports = new Config();
