'use strict';

exports.__esModule = true;
exports['default'] = Knex;

function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {'default': obj};
}

var _raw = require('./raw');

var _raw2 = _interopRequireDefault(_raw);

var _helpers = require('./helpers');

var _client = require('./client');

var _client2 = _interopRequireDefault(_client);

var _utilMakeClient = require('./util/make-client');

var _utilMakeClient2 = _interopRequireDefault(_utilMakeClient);

var _utilMakeKnex = require('./util/make-knex');

var _utilMakeKnex2 = _interopRequireDefault(_utilMakeKnex);

var _utilParseConnection = require('./util/parse-connection');

var _utilParseConnection2 = _interopRequireDefault(_utilParseConnection);

var dash = require('./dash');

// The client names we'll allow in the `{name: lib}` pairing.
var aliases = {
    'mariadb': 'maria',
    'mariasql': 'maria',
    'pg': 'postgres',
    'postgresql': 'postgres',
    'sqlite': 'sqlite3'
};

function Knex(config) {
    if (typeof config === 'string') {
        return new Knex(dash.override(_utilParseConnection2['default'](config), arguments[2] || {}));
    }
    var Dialect = undefined;
    if (arguments.length === 0 || !config.client && !config.dialect) {
        Dialect = _utilMakeClient2['default'](_client2['default']);
    } else if (typeof config.client === 'function' && config.client.prototype instanceof _client2['default']) {
        Dialect = _utilMakeClient2['default'](config.client);
    } else {
        var clientName = config.client || config.dialect;
        Dialect = _utilMakeClient2['default'](require('./dialects/' + (aliases[clientName] || clientName) + '/index.js'));
    }
    if (typeof config.connection === 'string') {
        config = dash.override(config, {connection: _utilParseConnection2['default'](config.connection).connection}, true);
    }
    return _utilMakeKnex2['default'](new Dialect(config));
}

// Expose Client on the main Knex namespace.
Knex.Client = _client2['default'];

// Expose Knex version on the main Knex namespace.
Knex.VERSION = require('../package.json').version;

// Run a "raw" query, though we can't do anything with it other than put
// it in a query statement.
Knex.raw = function (sql, bindings) {
    return new _raw2['default']({}).set(sql, bindings);
};

// Create a new "knex" instance with the appropriate configured client.
Knex.initialize = function (config) {
    _helpers.warn('knex.initialize is deprecated, pass your config object directly to the knex module');
    return new Knex(config);
};

// Bluebird
Knex.Promise = require('./promise');

// Doing this ensures Browserify works. Still need to figure out
// the best way to do some of this.
module.exports = exports['default'];