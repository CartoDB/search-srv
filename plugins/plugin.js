"use strict";

/*
 * This class is meant to act as the base class for all plugins.
 * It is kept pretty generic on purpose. All a plugin has to implement
 * is a query method that queries for the text and calls the callback
 * with a list of results.
 */
class Plugin {
    constructor() {}
    query(text, callback) {
        throw new TypeError('Query method must be implemented by subclass');
    }
}

module.exports = Plugin
