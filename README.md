# search-srv

### Overview
A search aggregation service.
![alt text](docs/search_overview.pdf "Search Overview")

### Installation
Before executing the commands below, make sure you have node version 6.9.1 (or later) installed.
```
git clone https://bbgithub.dev.bloomberg.com/datavis-cartodb/search-srv.git
cd search-srv
npm install
npm start <port> <log_file> <settings.cfg>
```

### Usage

To get autocomplete results, send a POST request to `/search-srv-ac`.

For example, get results for "hello" by sending the following payload:
```
{
    "text": "hello"
}
```

If you want to only search across specific services by name, e.g. "service-1" and "service-2", send:
```
{
    "text": "hello",
    "services": ["service-1", "service-2"]
}
```

Certain plugins may require parameters to be passed along in the request. For example, the `Postgres` plugin requires a username.
In order to send parameters to a service, we need to know what the service has been named in Search-srv's configuration.
Assuming there is a `Postgres` service named "pg-prod" and we want to provide the username argument "john", we could do the following:
```
{
    "text": "hello",
    "params": {
        "pg-prod": {
            "username": "john"
        }
    }
}
```

### Output
Search-srv will return a JSON object of results with the following format:
```
{
    "service-1": [
        ...
    ],
    "service-2": [
        ...
    ],
    ...
}
```
Each service will be an attribute of the object and its value will be a list of results.

Each result is an object with the following format:
```
{
    "id": "<some unique identifier for the dataset that this entry came from>",
    "dataset": "<the name of the dataset, e.g. factories>",
    "score": <some numerical value related to the relevance of the search result>,
    "is_dataset": <boolean denoting whether the result is an entity from a set or a set itself>
    "data": {
        "<column name>": "<value>"
    }
}
```
The data attribute is an object containing a set of `<key, value>` pairs with at least one value that matches the search query.


### Configuration
Search-srv can be configured by providing a `settings.cfg` file.

Here you can modify the global search timeout (in milliseconds) and configure plugins.

To add new plugins, simply add another object to the `plugins` list.

Each object requires two attributes:

1. `type` - the type of plugin, this corresponds to the name of the plugin file found in `plugins/`
2. `arguments` - the arguments given to the plugin constructor; the first will be a name which must be unique across the configured plugins; the rest will be specific to the plugin so look at the plugin constructor

Take a look at the following example `settings.cfg`:
```
{
    "timeout": 50,
    "plugins": [
        {
            "type": "elasticsearch",
            "arguments": ["maps-elasticsearch", "host", "port"]
        },
        {
            "type": "postgres",
            "arguments": ["maps-postgres", "host", "port", "username", "password", "database-name"]
        }
    ]
}
```

To refresh Search-srv's configuration while the server is running, send a request to `/search-srv-refresh`.


### Health
Search-srv has a health check endpoint available. Just send a request to `/search-srv-health`.
