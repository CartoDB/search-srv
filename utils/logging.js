"use strict";

const fs = require('fs');

const INFO = 'INFO';
const WARN = 'WARN';
const ERROR = 'ERROR';


class logging {
    constructor() {
        this.file_descriptor = null;
    }

    set_log_file(filename) {
        this.file_descriptor = fs.openSync(filename, 'a');
    }

    _format_msg(level, msg) {
        return new Date().toISOString() + ':' + level + ':' + msg + '\n';
    }

    write(level, msg) {
        fs.appendFile(this.file_descriptor, this._format_msg(level, msg), function() {});
    }

    info(msg) {
        this.write(INFO, msg);
    }

    warn(msg) {
        this.write(WARN, msg);
    }

    error(msg) {
        this.write(ERROR, msg);
        if ( msg instanceof Error) {
            console.error("ERROR: stack = ", msg.stack);
            this.write(ERROR, msg.stack);
        } else {
            this.write(ERROR, msg);
        }
    }

    destructor() {
        fs.closeSync(this.file_descriptor);
    }
}


module.exports = new logging();
