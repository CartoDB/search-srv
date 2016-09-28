"use strict";

/*
 * This class is meant to act as the base class for all plugins.
 * It is kept pretty generic on purpose. All a plugin has to do is
 * implement:
 * query(text, callback)
    - query for text and call callback with a list of results
 */
class Plugin {
    constructor(name) {
        this.name = name;
    }
    query(text, callback) {
        throw new TypeError('Query method must be implemented by subclass');
    }
}

module.exports = Plugin
