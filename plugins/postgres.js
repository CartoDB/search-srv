"use strict";

const pg = require('pg');
const Plugin = require('./plugin');
const log = require('../utils/logging');
const log_prefix = 'Postgres Plugin:';
const search_query = `select * from search_return_table_records($1, $2, $3, $4)`;

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
        this.user_regex = new RegExp("^[0-9a-zA-Z]+$");
    }

    validate_username(additional_params) {
        try {
            if (this.user_regex.exec(additional_params.username)) {
                return additional_params.username;
            }
        }
        catch(err) {}
        return null;
    }

    query(text, callback, additional_params) {
        var username = this.validate_username(additional_params);
        if (typeof username != 'string') {
            log.warn(log_prefix + 'No valid username passed to postgres query');
            callback([]);
            return;
        }

        var client = new pg.Client(this.config);
        var self = this;

        try {
            client.connect(function(err) {
                if (err) {
                    log.error(err);
                    callback([]);
                    return;
                }

                // Prepare query arguments
                text = text.toLowerCase();
                var prefix_text = text.replace(new RegExp(' ', 'g'), '+') + ':*';
                var like_text = '%' + text + '%';
                var query_config = {
                    text: search_query,
                    values: [text, username, prefix_text, like_text]
                }

                log.info("Running query=" +  JSON.stringify(query_config));

                client.query(query_config, function(err, result) {
                    if (err) {
                        log.error(err);
                        callback([]);
                        return;
                    }
                    try {
                        client.end();
                        console.log("Returned result.rows(", result.rows.length, ") from query=", result.rows);
                        log.info("Returned result.rows(" +  result.rows.length + ") from query=" + JSON.stringify(result.rows));
                        callback(result.rows.map(self.format_suggestion));
                    }
                    catch(err) {
                        log.error(err);
                        callback([]);
                    }
                });
            });
        }
        catch(err) {
            log.error(err);
            callback([]);
        }
    }

    format_suggestion(suggestion) {
        var pl = {};
        pl.score = suggestion['rank1'];
        pl.id = suggestion['id1'];
        pl.dataset = suggestion['name1'];
        pl.is_dataset = true;
        pl.data = {
            name: suggestion['name1'],
            description: suggestion['description1'],
            tags: suggestion['tags1']
        };
        return pl;
    }
}


module.exports = Postgres
