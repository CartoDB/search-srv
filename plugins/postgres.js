"use strict";

const pg = require('pg');
const Plugin = require('./plugin');

const search_query = `\
SELECT
    id,
    username,
    type,
    name,
    description,
    tags,
    (1.0 / (CASE WHEN pos_name = 0 THEN 10000 ELSE pos_name END) + 1.0 / (CASE WHEN pos_tags = 0 THEN 10000 ELSE pos_tags END)) AS rank
FROM (
    SELECT
        v.id,
        u.username,
        v.type,
        v.name,
        v.description,
        v.tags,
        COALESCE(position($1 in lower(v.name)), 0) AS pos_name,
        COALESCE(position($1 in lower(array_to_string(v.tags, ' '))), 0) * 1000 AS pos_tags
    FROM visualizations AS v
        INNER JOIN users AS u on u.id = v.user_id
        LEFT JOIN external_sources AS es ON es.visualization_id = v.id
        LEFT JOIN external_data_imports AS edi ON (
            edi.external_source_id = es.id AND
            (SELECT state FROM data_imports WHERE id = edi.data_import_id) <> 'failure'
        ) WHERE (
            edi.id IS NULL AND
            v.user_id = (SELECT id FROM users WHERE username=$2) AND
            v.type in ('table', 'remote') AND (
                to_tsvector(COALESCE(v.name, '')) @@ to_tsquery($3) OR
                to_tsvector(array_to_string(v.tags, ' ')) @@ to_tsquery($3) OR
                v.name ILIKE $4 OR
                array_to_string(v.tags, ' ') ILIKE $4
            )
        )
) AS results
ORDER BY rank DESC, type DESC LIMIT 50`;
console.log(search_query);


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

    query(text, callback, username) {
		if(typeof username === 'undefined') {
			console.warning('No username passed to postgres query');
			callback([]);
			return;
		}
        var client = new pg.Client(this.config);
        var self = this;

        try {
            client.connect(function(err) {
                if (err) {
                    console.error(err);
                    callback([]);
                    return;
                }

                // Prepare query arguments
                text = text.toLowerCase();
                var prefix_text = text.replace(' ', '+') + ':*';
                var like_text = '%' + text + '%';
                var query_config = {
                    text: search_query,
                    values: [text, username, prefix_text, like_text]
                }

                client.query(query_config, function(err, result) {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    try {
                        client.end();
                        callback(result.rows.map(self.format_suggestion));
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
