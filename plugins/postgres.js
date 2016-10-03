"use strict";

const pg = require('pg');
const Plugin = require('./plugin');


class Postgres extends Plugin {
    constructor(name, host, port, user, password, database) {
        super(name);
        this.config = {
            host: host,
            port: port,
            user: user,
            password: null,
            database: database
        };
        console.log(this.config);
        //this.client = new pg.Client(this.config);
        pg.defaults.password = null;
        this.client = new pg.Client('postgres://' + user + '@' + host + ':' + port + '/' + database)
    }

    query(text, callback) {
        var self = this;
        try {
            this.client.connect(function(err) {
                if (err) {
                    console.error(err);
                    callback([]);
                    return;
                }
                var query = 'SELECT name, type, privacy FROM visualizations WHERE privacy=\'public\' AND type=\'table\' AND user_id=(SELECT id FROM users WHERE username=\'15775613\')';
                self.client.query(query, function(err, result) {
                    if (err) {
                        console.error(err);
                        return
                    }
                    try {
                        self.client.end(console.error);
                        console.log(result.rows);  // XXX
                        var suggestions = JSON.parse(result.rows);
                        var payloads = suggestions.map(this.format_suggestion);
                        callback(payloads);
                    }
                    catch(err) {
                        console.error(err);
                        callback([]);
                    }
                });
            });
        }
        catch(err) {
            console.error(err);
            callback([]);
        }
    }

    format_suggestion(suggestion) {
        var pl = {};
        pl.score = suggestion['rank'];
        pl.id = suggestion['id'];
        pl.dataset = suggestion['name'];
        pl.location = 'cartodb';
        pl.is_dataset = true;
        pl.data = {
            name: suggestion['name'],
            description: suggestion['description'],
            tags: suggestion['tags']
        };
        return pl;
    }
}


module.exports = Postgres
