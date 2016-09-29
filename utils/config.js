"use strict";

const fs = require('fs');
const CONFIG_FILE = './settings.cfg';


class Config {
    constructor() {
        this.plugins = [];
        this.plugins_rollback = [];
        this.read();
    }

    read() {
        try {
            this.plugins_rollback = this.current_config;
            this.plugins = [];
            let contents = fs.readFileSync(CONFIG_FILE);
            let config = JSON.parse(contents);
            for (var idx in config['plugins']) {
                let cls = require('../plugins/' + config['plugins'][idx]['type']);
                this.plugins.push(new (
                    Function.prototype.bind.apply(cls, [null].concat(config['plugins'][idx]['arguments']))
                ));
            }
        }
        catch(err) {
            this.plugins = this.plugins_rollback;
            this.plugins_rollback = [];
            this.error(err);
        }
    }

    refresh() {
        this.read();
    }

    get_plugins() {
        return this.plugins;
    }

    error(err) {
        console.error(err);
    }
}


module.exports = new Config();
