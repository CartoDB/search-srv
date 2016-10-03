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
            password: password,
            database: database
        };
    }

    query(text, callback) {
        var client = new pg.Client(this.config);
        var self = this;
        try {
            client.connect(function(err) {
                if (err) {
                    console.error(err);
                    callback([]);
                    return;
                }
                var query = 'SELECT name, type, privacy FROM visualizations WHERE privacy=\'public\' AND type=\'table\' AND user_id=(SELECT id FROM users WHERE username=\'15775613\')';
                client.query(query, function(err, result) {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    try {
                        client.end(console.error);
                        console.log(result.rows);  // XXX
                        var payloads = result.rows.map(self.format_suggestion);
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
