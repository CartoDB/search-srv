"use strict";

const fs = require('fs');
const log = require('./logging.js');
const log_prefix = 'Config Util:'
const CONFIG_FILE = './settings.cfg';


class Config {
    constructor() {
        this.plugins = {};
        this.plugins_rollback = {};
        this.timeout = 0;
        this.read();
    }

    read() {
        try {
            this.plugins_rollback = this.current_config;
            this.plugins = {};
            let contents = fs.readFileSync(CONFIG_FILE);
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
        console.error(log_prefix + err);
    }
}


module.exports = new Config();
