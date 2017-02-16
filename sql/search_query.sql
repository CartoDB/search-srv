----Add this query in a file say - search_query2.sql
----Define it in postgres db as e.g. /bb/datavis/cartodb/embedded/bin/psql -U postgres -p 4302 -d carto_db_development -f search_query2.sql
---- Use it in postgres DB connection as e.g. select * from search_return_table_records('cru','vmanohar','cru:*', '%cru%');

---Function or Stored procedure's definition
CREATE OR REPLACE FUNCTION search_return_table_records(v1 text,v2 text,v3 text,v4 text)
RETURNS TABLE(id1 uuid, username1 text,type1 text, name1 text,description1 text,tags1 text[],rank1 numeric) AS $$

BEGIN

RETURN QUERY SELECT
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
WHERE name <> 'shared_empty_dataset'
ORDER BY rank DESC, type DESC LIMIT 50;

END;
$$  LANGUAGE 'plpgsql' ;
