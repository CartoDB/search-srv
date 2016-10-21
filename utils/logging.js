"use strict";

const INFO = 'INFO';
const WARN = 'WARN';
const ERROR = 'ERROR';


class logging {
    _format_msg(level, msg) {
        return new Date().toISOString() + ':' + level + ':' + msg;
    }

    info(msg) {
        console.log(this._format_msg(INFO, msg));
    }

    warn(msg) {
        console.warn(this._format_msg(WARN, msg));
    }

    error(msg) {
        console.error(this._format_msg(ERROR, msg));
    }
}


module.exports = new logging();
