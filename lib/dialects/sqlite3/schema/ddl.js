// SQLite3_DDL
//
// All of the SQLite3 specific DDL helpers for renaming/dropping
// columns and changing datatypes.
// -------

'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {'default': obj};
}

var _promise = require('../../../promise');

var _promise2 = _interopRequireDefault(_promise);

var dash = require('../../../dash');

// So altering the schema in SQLite3 is a major pain.
// We have our own object to deal with the renaming and altering the types
// for sqlite3 things.
function SQLite3_DDL(client, tableCompiler, pragma, connection) {
    this.client = client;
    this.tableCompiler = tableCompiler;
    this.pragma = pragma;
    this.tableName = this.tableCompiler.tableNameRaw;
    this.alteredName = dash.uniqueId('_knex_temp_alter');
    this.connection = connection;
}

dash.override(SQLite3_DDL.prototype, {

    getColumn: _promise2['default'].method(function (column) {
        var currentCol = (this.pragma || []).find(function (item) {
            return item.name === column;
        });
        if (!currentCol) throw new Error('The column ' + column + ' is not in the ' + this.tableName + ' table');
        return currentCol;
    }),

    getTableSql: function getTableSql() {
        return this.trx.raw('SELECT name, sql FROM sqlite_master WHERE type="table" AND name="' + this.tableName + '"');
    },

    renameTable: _promise2['default'].method(function () {
        return this.trx.raw('ALTER TABLE "' + this.tableName + '" RENAME TO "' + this.alteredName + '"');
    }),

    dropOriginal: function dropOriginal() {
        return this.trx.raw('DROP TABLE "' + this.tableName + '"');
    },

    dropTempTable: function dropTempTable() {
        return this.trx.raw('DROP TABLE "' + this.alteredName + '"');
    },

    copyData: function copyData() {
        return this.trx.raw('SELECT * FROM "' + this.tableName + '"').bind(this).then(this.insertChunked(20, this.alteredName));
    },

    reinsertData: function reinsertData(iterator) {
        return function () {
            return this.trx.raw('SELECT * FROM "' + this.alteredName + '"').bind(this).then(this.insertChunked(20, this.tableName, iterator));
        };
    },

    insertChunked: function insertChunked(amount, target, iterator) {

        iterator = iterator || dash.identity;

        return function (result) {
            var batch = [];
            var ddl = this;
            return _promise2['default'].reduce(result, function (memo, row) {
                memo++;
                batch.push(row);
                if (memo % 20 === 0 || memo === result.length) {
                    return ddl.trx.queryBuilder().table(target).insert((batch || []).map(iterator)).then(function () {
                        batch = [];
                    }).thenReturn(memo);
                }
                return memo;
            }, 0);
        };
    },

    createTempTable: function createTempTable(createTable) {
        return function () {
            return this.trx.raw(createTable.sql.replace(this.tableName, this.alteredName));
        };
    },

    _doReplace: function _doReplace(sql, from, to) {
        var matched = sql.match(/^CREATE TABLE (\S+) \((.*)\)/);

        var tableName = matched[1];
        var defs = matched[2];

        if (!defs) {
            throw new Error('No column definitions in this statement!');
        }

        var parens = 0,
            args = [],
            ptr = 0;
        var i = 0;
        var x = defs.length;
        for (i = 0; i < x; i++) {
            switch (defs[i]) {
                case '(':
                    parens++;
                    break;
                case ')':
                    parens--;
                    break;
                case ',':
                    if (parens === 0) {
                        args.push(defs.slice(ptr, i));
                        ptr = i + 1;
                    }
                    break;
                case ' ':
                    if (ptr === i) {
                        ptr = i + 1;
                    }
                    break;
            }
        }
        args.push(defs.slice(ptr, i));

        args = args.map(function (item) {
            var split = item.split(' ');

            if (split[0] === from) {
                // column definition
                if (to) {
                    split[0] = to;
                    return split.join(' ');
                }
                return ''; // for deletions
            }

            // skip constraint name
            var idx = /constraint/i.test(split[0]) ? 2 : 0;

            // primary key and unique constraints have one or more
            // columns from this table listed between (); replace
            // one if it matches
            if (/primary|unique/i.test(split[idx])) {
                return item.replace(/\(.*\)/, function (columns) {
                    return columns.replace(from, to);
                });
            }

            // foreign keys have one or more columns from this table
            // listed between (); replace one if it matches
            // foreign keys also have a 'references' clause
            // which may reference THIS table; if it does, replace
            // column references in that too!
            if (/foreign/.test(split[idx])) {
                split = item.split(/ references /i);
                // the quoted column names save us from having to do anything
                // other than a straight replace here
                split[0] = split[0].replace(from, to);

                if (split[1].slice(0, tableName.length) === tableName) {
                    split[1] = split[1].replace(/\(.*\)/, function (columns) {
                        return columns.replace(from, to);
                    });
                }
                return split.join(' references ');
            }

            return item;
        });
        return sql.replace(/\(.*\)/, function () {
            return '(' + args.join(', ') + ')';
        }).replace(/,\s*([,)])/, '$1');
    },

    // Boy, this is quite a method.
    renameColumn: _promise2['default'].method(function (from, to) {
        var _this = this;

        return this.client.transaction(function (trx) {
            _this.trx = trx;
            return _this.getColumn(from).bind(_this).then(_this.getTableSql).then(function (sql) {
                var a = this.client.wrapIdentifier(from);
                var b = this.client.wrapIdentifier(to);
                var createTable = sql[0];
                var newSql = this._doReplace(createTable.sql, a, b);
                if (sql === newSql) {
                    throw new Error('Unable to find the column to change');
                }
                return _promise2['default'].bind(this).then(this.createTempTable(createTable)).then(this.copyData).then(this.dropOriginal).then(function () {
                    return this.trx.raw(newSql);
                }).then(this.reinsertData(function (row) {
                    row[to] = row[from];
                    return dash.omit(row, from);
                })).then(this.dropTempTable);
            });
        }, {connection: this.connection});
    }),

    dropColumn: _promise2['default'].method(function (column) {
        var _this2 = this;

        return this.client.transaction(function (trx) {
            _this2.trx = trx;
            return _this2.getColumn(column).bind(_this2).then(_this2.getTableSql).then(function (sql) {
                var createTable = sql[0];
                var a = this.client.wrapIdentifier(column);
                var newSql = this._doReplace(createTable.sql, a, '');
                if (sql === newSql) {
                    throw new Error('Unable to find the column to change');
                }
                return _promise2['default'].bind(this).then(this.createTempTable(createTable)).then(this.copyData).then(this.dropOriginal).then(function () {
                    return this.trx.raw(newSql);
                }).then(this.reinsertData(function (row) {
                    return dash.omit(row, column);
                })).then(this.dropTempTable);
            });
        }, {connection: this.connection});
    })

});

exports['default'] = SQLite3_DDL;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9kaWFsZWN0cy9zcWxpdGUzL3NjaGVtYS9kZGwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozt1QkFPb0Isa0JBQWtCOzs7O3NCQUNzQixRQUFROzs7OztBQUtwRSxTQUFTLFdBQVcsQ0FBQyxNQUFNLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUU7QUFDOUQsTUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUE7QUFDcEIsTUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7QUFDbkMsTUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7QUFDckIsTUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQztBQUNqRCxNQUFJLENBQUMsV0FBVyxHQUFHLGlCQUFTLGtCQUFrQixDQUFDLENBQUM7QUFDaEQsTUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUE7Q0FDN0I7O0FBRUQsZUFBTyxXQUFXLENBQUMsU0FBUyxFQUFFOztBQUU1QixXQUFTLEVBQUUscUJBQVEsTUFBTSxDQUFDLFVBQVMsTUFBTSxFQUFFO0FBQ3pDLFFBQU0sVUFBVSxHQUFHLGFBQUssSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUMsQ0FBQyxDQUFDO0FBQ3JELFFBQUksQ0FBQyxVQUFVLEVBQUUsTUFBTSxJQUFJLEtBQUssaUJBQWUsTUFBTSx1QkFBa0IsSUFBSSxDQUFDLFNBQVMsWUFBUyxDQUFDO0FBQy9GLFdBQU8sVUFBVSxDQUFDO0dBQ25CLENBQUM7O0FBRUYsYUFBVyxFQUFBLHVCQUFHO0FBQ1osV0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsdUVBQ21ELElBQUksQ0FBQyxTQUFTLE9BQ25GLENBQUM7R0FDSDs7QUFFRCxhQUFXLEVBQUUscUJBQVEsTUFBTSxDQUFDLFlBQVc7QUFDckMsV0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsbUJBQWlCLElBQUksQ0FBQyxTQUFTLHFCQUFnQixJQUFJLENBQUMsV0FBVyxPQUFJLENBQUM7R0FDeEYsQ0FBQzs7QUFFRixjQUFZLEVBQUEsd0JBQUc7QUFDYixXQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxrQkFBZ0IsSUFBSSxDQUFDLFNBQVMsT0FBSSxDQUFDO0dBQ3ZEOztBQUVELGVBQWEsRUFBQSx5QkFBRztBQUNkLFdBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLGtCQUFnQixJQUFJLENBQUMsV0FBVyxPQUFJLENBQUM7R0FDekQ7O0FBRUQsVUFBUSxFQUFBLG9CQUFHO0FBQ1QsV0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcscUJBQW1CLElBQUksQ0FBQyxTQUFTLE9BQUksQ0FDckQsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUNWLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztHQUNuRDs7QUFFRCxjQUFZLEVBQUEsc0JBQUMsUUFBUSxFQUFFO0FBQ3JCLFdBQU8sWUFBVztBQUNoQixhQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxxQkFBbUIsSUFBSSxDQUFDLFdBQVcsT0FBSSxDQUN2RCxJQUFJLENBQUMsSUFBSSxDQUFDLENBQ1YsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztLQUMzRCxDQUFDO0dBQ0g7O0FBRUQsZUFBYSxFQUFBLHVCQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFO0FBQ3RDLFlBQVEsR0FBRyxRQUFRLG9CQUFZLENBQUM7QUFDaEMsV0FBTyxVQUFTLE1BQU0sRUFBRTtBQUN0QixVQUFJLEtBQUssR0FBRyxFQUFFLENBQUM7QUFDZixVQUFNLEdBQUcsR0FBRyxJQUFJLENBQUM7QUFDakIsYUFBTyxxQkFBUSxNQUFNLENBQUMsTUFBTSxFQUFFLFVBQVMsSUFBSSxFQUFFLEdBQUcsRUFBRTtBQUNoRCxZQUFJLEVBQUUsQ0FBQztBQUNQLGFBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDaEIsWUFBSSxJQUFJLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxJQUFJLEtBQUssTUFBTSxDQUFDLE1BQU0sRUFBRTtBQUM3QyxpQkFBTyxHQUFHLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxDQUMxQixLQUFLLENBQUMsTUFBTSxDQUFDLENBQ2IsTUFBTSxDQUFDLFlBQUksS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQzVCLElBQUksQ0FBQyxZQUFXO0FBQUUsaUJBQUssR0FBRyxFQUFFLENBQUM7V0FBRSxDQUFDLENBQ2hDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNyQjtBQUNELGVBQU8sSUFBSSxDQUFDO09BQ2IsRUFBRSxDQUFDLENBQUMsQ0FBQztLQUNQLENBQUM7R0FDSDs7QUFFRCxpQkFBZSxFQUFBLHlCQUFDLFdBQVcsRUFBRTtBQUMzQixXQUFPLFlBQVc7QUFDaEIsYUFBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0tBQ2hGLENBQUM7R0FDSDs7QUFFRCxZQUFVLEVBQUMsb0JBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUU7QUFDekIsUUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDOztBQUUxRCxRQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0IsUUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUV4QixRQUFJLENBQUMsSUFBSSxFQUFFO0FBQUUsWUFBTSxJQUFJLEtBQUssQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO0tBQUU7O0FBRTNFLFFBQUksTUFBTSxHQUFHLENBQUM7UUFBRSxJQUFJLEdBQUcsRUFBRztRQUFFLEdBQUcsR0FBRyxDQUFDLENBQUM7QUFDcEMsUUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ1YsUUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztBQUN0QixTQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUN0QixjQUFRLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDYixhQUFLLEdBQUc7QUFDTixnQkFBTSxFQUFFLENBQUM7QUFDVCxnQkFBTTtBQUFBLEFBQ1IsYUFBSyxHQUFHO0FBQ04sZ0JBQU0sRUFBRSxDQUFDO0FBQ1QsZ0JBQU07QUFBQSxBQUNSLGFBQUssR0FBRztBQUNOLGNBQUksTUFBTSxLQUFLLENBQUMsRUFBRTtBQUNoQixnQkFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlCLGVBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1dBQ2I7QUFDRCxnQkFBTTtBQUFBLEFBQ1IsYUFBSyxHQUFHO0FBQ04sY0FBSSxHQUFHLEtBQUssQ0FBQyxFQUFFO0FBQ2IsZUFBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7V0FDYjtBQUNELGdCQUFNO0FBQUEsT0FDVDtLQUNGO0FBQ0QsUUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUU5QixRQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksRUFBRTtBQUM5QixVQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDOztBQUU1QixVQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUU7O0FBRXJCLFlBQUksRUFBRSxFQUFFO0FBQ04sZUFBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNkLGlCQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDeEI7QUFDRCxlQUFPLEVBQUUsQ0FBQztPQUNYOzs7QUFHRCxVQUFNLEdBQUcsR0FBSSxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEFBQUMsQ0FBQzs7Ozs7QUFLbkQsVUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7QUFDdEMsZUFBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxVQUFBLE9BQU87aUJBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO1NBQUEsQ0FBQyxDQUFDO09BQ3JFOzs7Ozs7O0FBT0QsVUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO0FBQzlCLGFBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDOzs7QUFHcEMsYUFBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDOztBQUV0QyxZQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsS0FBSyxTQUFTLEVBQUU7QUFDckQsZUFBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLFVBQUEsT0FBTzttQkFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7V0FBQSxDQUFDLENBQUM7U0FDN0U7QUFDRCxlQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7T0FDbkM7O0FBRUQsYUFBTyxJQUFJLENBQUM7S0FDYixDQUFDLENBQUM7QUFDSCxXQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFO21CQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0tBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7R0FDeEY7OztBQUdELGNBQVksRUFBRSxxQkFBUSxNQUFNLENBQUMsVUFBUyxJQUFJLEVBQUUsRUFBRSxFQUFFOzs7QUFDOUMsV0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFBLEdBQUcsRUFBSTtBQUNwQyxZQUFLLEdBQUcsR0FBRyxHQUFHLENBQUE7QUFDZCxhQUFPLE1BQUssU0FBUyxDQUFDLElBQUksQ0FBQyxDQUN4QixJQUFJLE9BQU0sQ0FDVixJQUFJLENBQUMsTUFBSyxXQUFXLENBQUMsQ0FDdEIsSUFBSSxDQUFDLFVBQVMsR0FBRyxFQUFFO0FBQ2xCLFlBQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzNDLFlBQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3pDLFlBQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQixZQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3RELFlBQUksR0FBRyxLQUFLLE1BQU0sRUFBRTtBQUNsQixnQkFBTSxJQUFJLEtBQUssQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDO1NBQ3hEO0FBQ0QsZUFBTyxxQkFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQ3RCLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQ3ZDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQ25CLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQ3ZCLElBQUksQ0FBQyxZQUFXO0FBQ2YsaUJBQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDN0IsQ0FBQyxDQUNELElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVMsR0FBRyxFQUFFO0FBQ3BDLGFBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDcEIsaUJBQU8sYUFBSyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDeEIsQ0FBQyxDQUFDLENBQ0YsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtPQUM1QixDQUFDLENBQUE7S0FDTCxFQUFFLEVBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUMsQ0FBQyxDQUFBO0dBQ2xDLENBQUM7O0FBRUYsWUFBVSxFQUFFLHFCQUFRLE1BQU0sQ0FBQyxVQUFTLE1BQU0sRUFBRTs7O0FBQzFDLFdBQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBQSxHQUFHLEVBQUk7QUFDcEMsYUFBSyxHQUFHLEdBQUcsR0FBRyxDQUFBO0FBQ2QsYUFBTyxPQUFLLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FDNUIsSUFBSSxRQUFNLENBQ1YsSUFBSSxDQUFDLE9BQUssV0FBVyxDQUFDLENBQ3RCLElBQUksQ0FBQyxVQUFTLEdBQUcsRUFBRTtBQUNsQixZQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0IsWUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDN0MsWUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUN2RCxZQUFJLEdBQUcsS0FBSyxNQUFNLEVBQUU7QUFDbEIsZ0JBQU0sSUFBSSxLQUFLLENBQUMscUNBQXFDLENBQUMsQ0FBQztTQUN4RDtBQUNELGVBQU8scUJBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUN2QyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUNuQixJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUN2QixJQUFJLENBQUMsWUFBVztBQUNmLGlCQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQzdCLENBQUMsQ0FDRCxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFBLEdBQUc7aUJBQUksYUFBSyxHQUFHLEVBQUUsTUFBTSxDQUFDO1NBQUEsQ0FBQyxDQUFDLENBQ2pELElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7T0FDN0IsQ0FBQyxDQUFBO0tBQ0gsRUFBRSxFQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFDLENBQUMsQ0FBQTtHQUNsQyxDQUFDOztDQUVILENBQUMsQ0FBQTs7cUJBR2EsV0FBVyIsImZpbGUiOiJkZGwuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbi8vIFNRTGl0ZTNfRERMXG4vL1xuLy8gQWxsIG9mIHRoZSBTUUxpdGUzIHNwZWNpZmljIERETCBoZWxwZXJzIGZvciByZW5hbWluZy9kcm9wcGluZ1xuLy8gY29sdW1ucyBhbmQgY2hhbmdpbmcgZGF0YXR5cGVzLlxuLy8gLS0tLS0tLVxuXG5pbXBvcnQgUHJvbWlzZSBmcm9tICcuLi8uLi8uLi9wcm9taXNlJztcbmltcG9ydCB7IGFzc2lnbiwgdW5pcXVlSWQsIGZpbmQsIGlkZW50aXR5LCBtYXAsIG9taXQgfSBmcm9tICdsb2Rhc2gnXG5cbi8vIFNvIGFsdGVyaW5nIHRoZSBzY2hlbWEgaW4gU1FMaXRlMyBpcyBhIG1ham9yIHBhaW4uXG4vLyBXZSBoYXZlIG91ciBvd24gb2JqZWN0IHRvIGRlYWwgd2l0aCB0aGUgcmVuYW1pbmcgYW5kIGFsdGVyaW5nIHRoZSB0eXBlc1xuLy8gZm9yIHNxbGl0ZTMgdGhpbmdzLlxuZnVuY3Rpb24gU1FMaXRlM19EREwoY2xpZW50LCB0YWJsZUNvbXBpbGVyLCBwcmFnbWEsIGNvbm5lY3Rpb24pIHtcbiAgdGhpcy5jbGllbnQgPSBjbGllbnRcbiAgdGhpcy50YWJsZUNvbXBpbGVyID0gdGFibGVDb21waWxlcjtcbiAgdGhpcy5wcmFnbWEgPSBwcmFnbWE7XG4gIHRoaXMudGFibGVOYW1lID0gdGhpcy50YWJsZUNvbXBpbGVyLnRhYmxlTmFtZVJhdztcbiAgdGhpcy5hbHRlcmVkTmFtZSA9IHVuaXF1ZUlkKCdfa25leF90ZW1wX2FsdGVyJyk7XG4gIHRoaXMuY29ubmVjdGlvbiA9IGNvbm5lY3Rpb25cbn1cblxuYXNzaWduKFNRTGl0ZTNfRERMLnByb3RvdHlwZSwge1xuXG4gIGdldENvbHVtbjogUHJvbWlzZS5tZXRob2QoZnVuY3Rpb24oY29sdW1uKSB7XG4gICAgY29uc3QgY3VycmVudENvbCA9IGZpbmQodGhpcy5wcmFnbWEsIHtuYW1lOiBjb2x1bW59KTtcbiAgICBpZiAoIWN1cnJlbnRDb2wpIHRocm93IG5ldyBFcnJvcihgVGhlIGNvbHVtbiAke2NvbHVtbn0gaXMgbm90IGluIHRoZSAke3RoaXMudGFibGVOYW1lfSB0YWJsZWApO1xuICAgIHJldHVybiBjdXJyZW50Q29sO1xuICB9KSxcblxuICBnZXRUYWJsZVNxbCgpIHtcbiAgICByZXR1cm4gdGhpcy50cngucmF3KFxuICAgICAgYFNFTEVDVCBuYW1lLCBzcWwgRlJPTSBzcWxpdGVfbWFzdGVyIFdIRVJFIHR5cGU9XCJ0YWJsZVwiIEFORCBuYW1lPVwiJHt0aGlzLnRhYmxlTmFtZX1cImBcbiAgICApO1xuICB9LFxuXG4gIHJlbmFtZVRhYmxlOiBQcm9taXNlLm1ldGhvZChmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy50cngucmF3KGBBTFRFUiBUQUJMRSBcIiR7dGhpcy50YWJsZU5hbWV9XCIgUkVOQU1FIFRPIFwiJHt0aGlzLmFsdGVyZWROYW1lfVwiYCk7XG4gIH0pLFxuXG4gIGRyb3BPcmlnaW5hbCgpIHtcbiAgICByZXR1cm4gdGhpcy50cngucmF3KGBEUk9QIFRBQkxFIFwiJHt0aGlzLnRhYmxlTmFtZX1cImApO1xuICB9LFxuXG4gIGRyb3BUZW1wVGFibGUoKSB7XG4gICAgcmV0dXJuIHRoaXMudHJ4LnJhdyhgRFJPUCBUQUJMRSBcIiR7dGhpcy5hbHRlcmVkTmFtZX1cImApO1xuICB9LFxuXG4gIGNvcHlEYXRhKCkge1xuICAgIHJldHVybiB0aGlzLnRyeC5yYXcoYFNFTEVDVCAqIEZST00gXCIke3RoaXMudGFibGVOYW1lfVwiYClcbiAgICAgIC5iaW5kKHRoaXMpXG4gICAgICAudGhlbih0aGlzLmluc2VydENodW5rZWQoMjAsIHRoaXMuYWx0ZXJlZE5hbWUpKTtcbiAgfSxcblxuICByZWluc2VydERhdGEoaXRlcmF0b3IpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy50cngucmF3KGBTRUxFQ1QgKiBGUk9NIFwiJHt0aGlzLmFsdGVyZWROYW1lfVwiYClcbiAgICAgICAgLmJpbmQodGhpcylcbiAgICAgICAgLnRoZW4odGhpcy5pbnNlcnRDaHVua2VkKDIwLCB0aGlzLnRhYmxlTmFtZSwgaXRlcmF0b3IpKTtcbiAgICB9O1xuICB9LFxuXG4gIGluc2VydENodW5rZWQoYW1vdW50LCB0YXJnZXQsIGl0ZXJhdG9yKSB7XG4gICAgaXRlcmF0b3IgPSBpdGVyYXRvciB8fCBpZGVudGl0eTtcbiAgICByZXR1cm4gZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICBsZXQgYmF0Y2ggPSBbXTtcbiAgICAgIGNvbnN0IGRkbCA9IHRoaXM7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWR1Y2UocmVzdWx0LCBmdW5jdGlvbihtZW1vLCByb3cpIHtcbiAgICAgICAgbWVtbysrO1xuICAgICAgICBiYXRjaC5wdXNoKHJvdyk7XG4gICAgICAgIGlmIChtZW1vICUgMjAgPT09IDAgfHwgbWVtbyA9PT0gcmVzdWx0Lmxlbmd0aCkge1xuICAgICAgICAgIHJldHVybiBkZGwudHJ4LnF1ZXJ5QnVpbGRlcigpXG4gICAgICAgICAgICAudGFibGUodGFyZ2V0KVxuICAgICAgICAgICAgLmluc2VydChtYXAoYmF0Y2gsIGl0ZXJhdG9yKSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKCkgeyBiYXRjaCA9IFtdOyB9KVxuICAgICAgICAgICAgLnRoZW5SZXR1cm4obWVtbyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1lbW87XG4gICAgICB9LCAwKTtcbiAgICB9O1xuICB9LFxuXG4gIGNyZWF0ZVRlbXBUYWJsZShjcmVhdGVUYWJsZSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnRyeC5yYXcoY3JlYXRlVGFibGUuc3FsLnJlcGxhY2UodGhpcy50YWJsZU5hbWUsIHRoaXMuYWx0ZXJlZE5hbWUpKTtcbiAgICB9O1xuICB9LFxuXG4gIF9kb1JlcGxhY2UgKHNxbCwgZnJvbSwgdG8pIHtcbiAgICBjb25zdCBtYXRjaGVkID0gc3FsLm1hdGNoKC9eQ1JFQVRFIFRBQkxFIChcXFMrKSBcXCgoLiopXFwpLyk7XG5cbiAgICBjb25zdCB0YWJsZU5hbWUgPSBtYXRjaGVkWzFdO1xuICAgIGNvbnN0IGRlZnMgPSBtYXRjaGVkWzJdO1xuXG4gICAgaWYgKCFkZWZzKSB7IHRocm93IG5ldyBFcnJvcignTm8gY29sdW1uIGRlZmluaXRpb25zIGluIHRoaXMgc3RhdGVtZW50IScpOyB9XG5cbiAgICBsZXQgcGFyZW5zID0gMCwgYXJncyA9IFsgXSwgcHRyID0gMDtcbiAgICBsZXQgaSA9IDA7XG4gICAgY29uc3QgeCA9IGRlZnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCB4OyBpKyspIHtcbiAgICAgIHN3aXRjaCAoZGVmc1tpXSkge1xuICAgICAgICBjYXNlICcoJzpcbiAgICAgICAgICBwYXJlbnMrKztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnKSc6XG4gICAgICAgICAgcGFyZW5zLS07XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJywnOlxuICAgICAgICAgIGlmIChwYXJlbnMgPT09IDApIHtcbiAgICAgICAgICAgIGFyZ3MucHVzaChkZWZzLnNsaWNlKHB0ciwgaSkpO1xuICAgICAgICAgICAgcHRyID0gaSArIDE7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICcgJzpcbiAgICAgICAgICBpZiAocHRyID09PSBpKSB7XG4gICAgICAgICAgICBwdHIgPSBpICsgMTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGFyZ3MucHVzaChkZWZzLnNsaWNlKHB0ciwgaSkpO1xuXG4gICAgYXJncyA9IGFyZ3MubWFwKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICBsZXQgc3BsaXQgPSBpdGVtLnNwbGl0KCcgJyk7XG5cbiAgICAgIGlmIChzcGxpdFswXSA9PT0gZnJvbSkge1xuICAgICAgICAvLyBjb2x1bW4gZGVmaW5pdGlvblxuICAgICAgICBpZiAodG8pIHtcbiAgICAgICAgICBzcGxpdFswXSA9IHRvO1xuICAgICAgICAgIHJldHVybiBzcGxpdC5qb2luKCcgJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnOyAvLyBmb3IgZGVsZXRpb25zXG4gICAgICB9XG5cbiAgICAgIC8vIHNraXAgY29uc3RyYWludCBuYW1lXG4gICAgICBjb25zdCBpZHggPSAoL2NvbnN0cmFpbnQvaS50ZXN0KHNwbGl0WzBdKSA/IDIgOiAwKTtcblxuICAgICAgLy8gcHJpbWFyeSBrZXkgYW5kIHVuaXF1ZSBjb25zdHJhaW50cyBoYXZlIG9uZSBvciBtb3JlXG4gICAgICAvLyBjb2x1bW5zIGZyb20gdGhpcyB0YWJsZSBsaXN0ZWQgYmV0d2VlbiAoKTsgcmVwbGFjZVxuICAgICAgLy8gb25lIGlmIGl0IG1hdGNoZXNcbiAgICAgIGlmICgvcHJpbWFyeXx1bmlxdWUvaS50ZXN0KHNwbGl0W2lkeF0pKSB7XG4gICAgICAgIHJldHVybiBpdGVtLnJlcGxhY2UoL1xcKC4qXFwpLywgY29sdW1ucyA9PiBjb2x1bW5zLnJlcGxhY2UoZnJvbSwgdG8pKTtcbiAgICAgIH1cblxuICAgICAgLy8gZm9yZWlnbiBrZXlzIGhhdmUgb25lIG9yIG1vcmUgY29sdW1ucyBmcm9tIHRoaXMgdGFibGVcbiAgICAgIC8vIGxpc3RlZCBiZXR3ZWVuICgpOyByZXBsYWNlIG9uZSBpZiBpdCBtYXRjaGVzXG4gICAgICAvLyBmb3JlaWduIGtleXMgYWxzbyBoYXZlIGEgJ3JlZmVyZW5jZXMnIGNsYXVzZVxuICAgICAgLy8gd2hpY2ggbWF5IHJlZmVyZW5jZSBUSElTIHRhYmxlOyBpZiBpdCBkb2VzLCByZXBsYWNlXG4gICAgICAvLyBjb2x1bW4gcmVmZXJlbmNlcyBpbiB0aGF0IHRvbyFcbiAgICAgIGlmICgvZm9yZWlnbi8udGVzdChzcGxpdFtpZHhdKSkge1xuICAgICAgICBzcGxpdCA9IGl0ZW0uc3BsaXQoLyByZWZlcmVuY2VzIC9pKTtcbiAgICAgICAgLy8gdGhlIHF1b3RlZCBjb2x1bW4gbmFtZXMgc2F2ZSB1cyBmcm9tIGhhdmluZyB0byBkbyBhbnl0aGluZ1xuICAgICAgICAvLyBvdGhlciB0aGFuIGEgc3RyYWlnaHQgcmVwbGFjZSBoZXJlXG4gICAgICAgIHNwbGl0WzBdID0gc3BsaXRbMF0ucmVwbGFjZShmcm9tLCB0byk7XG5cbiAgICAgICAgaWYgKHNwbGl0WzFdLnNsaWNlKDAsIHRhYmxlTmFtZS5sZW5ndGgpID09PSB0YWJsZU5hbWUpIHtcbiAgICAgICAgICBzcGxpdFsxXSA9IHNwbGl0WzFdLnJlcGxhY2UoL1xcKC4qXFwpLywgY29sdW1ucyA9PiBjb2x1bW5zLnJlcGxhY2UoZnJvbSwgdG8pKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3BsaXQuam9pbignIHJlZmVyZW5jZXMgJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBpdGVtO1xuICAgIH0pO1xuICAgIHJldHVybiBzcWwucmVwbGFjZSgvXFwoLipcXCkvLCAoKSA9PiBgKCR7YXJncy5qb2luKCcsICcpfSlgKS5yZXBsYWNlKC8sXFxzKihbLCldKS8sICckMScpO1xuICB9LFxuXG4gIC8vIEJveSwgdGhpcyBpcyBxdWl0ZSBhIG1ldGhvZC5cbiAgcmVuYW1lQ29sdW1uOiBQcm9taXNlLm1ldGhvZChmdW5jdGlvbihmcm9tLCB0bykge1xuICAgIHJldHVybiB0aGlzLmNsaWVudC50cmFuc2FjdGlvbih0cnggPT4ge1xuICAgICAgdGhpcy50cnggPSB0cnhcbiAgICAgIHJldHVybiB0aGlzLmdldENvbHVtbihmcm9tKVxuICAgICAgICAuYmluZCh0aGlzKVxuICAgICAgICAudGhlbih0aGlzLmdldFRhYmxlU3FsKVxuICAgICAgICAudGhlbihmdW5jdGlvbihzcWwpIHtcbiAgICAgICAgICBjb25zdCBhID0gdGhpcy5jbGllbnQud3JhcElkZW50aWZpZXIoZnJvbSk7XG4gICAgICAgICAgY29uc3QgYiA9IHRoaXMuY2xpZW50LndyYXBJZGVudGlmaWVyKHRvKTtcbiAgICAgICAgICBjb25zdCBjcmVhdGVUYWJsZSA9IHNxbFswXTtcbiAgICAgICAgICBjb25zdCBuZXdTcWwgPSB0aGlzLl9kb1JlcGxhY2UoY3JlYXRlVGFibGUuc3FsLCBhLCBiKTtcbiAgICAgICAgICBpZiAoc3FsID09PSBuZXdTcWwpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGZpbmQgdGhlIGNvbHVtbiB0byBjaGFuZ2UnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UuYmluZCh0aGlzKVxuICAgICAgICAgICAgLnRoZW4odGhpcy5jcmVhdGVUZW1wVGFibGUoY3JlYXRlVGFibGUpKVxuICAgICAgICAgICAgLnRoZW4odGhpcy5jb3B5RGF0YSlcbiAgICAgICAgICAgIC50aGVuKHRoaXMuZHJvcE9yaWdpbmFsKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLnRyeC5yYXcobmV3U3FsKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAudGhlbih0aGlzLnJlaW5zZXJ0RGF0YShmdW5jdGlvbihyb3cpIHtcbiAgICAgICAgICAgICAgcm93W3RvXSA9IHJvd1tmcm9tXTtcbiAgICAgICAgICAgICAgcmV0dXJuIG9taXQocm93LCBmcm9tKTtcbiAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgLnRoZW4odGhpcy5kcm9wVGVtcFRhYmxlKVxuICAgICAgICB9KVxuICAgIH0sIHtjb25uZWN0aW9uOiB0aGlzLmNvbm5lY3Rpb259KVxuICB9KSxcblxuICBkcm9wQ29sdW1uOiBQcm9taXNlLm1ldGhvZChmdW5jdGlvbihjb2x1bW4pIHtcbiAgICByZXR1cm4gdGhpcy5jbGllbnQudHJhbnNhY3Rpb24odHJ4ID0+IHtcbiAgICAgIHRoaXMudHJ4ID0gdHJ4XG4gICAgICByZXR1cm4gdGhpcy5nZXRDb2x1bW4oY29sdW1uKVxuICAgICAgLmJpbmQodGhpcylcbiAgICAgIC50aGVuKHRoaXMuZ2V0VGFibGVTcWwpXG4gICAgICAudGhlbihmdW5jdGlvbihzcWwpIHtcbiAgICAgICAgY29uc3QgY3JlYXRlVGFibGUgPSBzcWxbMF07XG4gICAgICAgIGNvbnN0IGEgPSB0aGlzLmNsaWVudC53cmFwSWRlbnRpZmllcihjb2x1bW4pO1xuICAgICAgICBjb25zdCBuZXdTcWwgPSB0aGlzLl9kb1JlcGxhY2UoY3JlYXRlVGFibGUuc3FsLCBhLCAnJyk7XG4gICAgICAgIGlmIChzcWwgPT09IG5ld1NxbCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGZpbmQgdGhlIGNvbHVtbiB0byBjaGFuZ2UnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUHJvbWlzZS5iaW5kKHRoaXMpXG4gICAgICAgICAgLnRoZW4odGhpcy5jcmVhdGVUZW1wVGFibGUoY3JlYXRlVGFibGUpKVxuICAgICAgICAgIC50aGVuKHRoaXMuY29weURhdGEpXG4gICAgICAgICAgLnRoZW4odGhpcy5kcm9wT3JpZ2luYWwpXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50cngucmF3KG5ld1NxbCk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAudGhlbih0aGlzLnJlaW5zZXJ0RGF0YShyb3cgPT4gb21pdChyb3csIGNvbHVtbikpKVxuICAgICAgICAgIC50aGVuKHRoaXMuZHJvcFRlbXBUYWJsZSk7XG4gICAgICB9KVxuICAgIH0sIHtjb25uZWN0aW9uOiB0aGlzLmNvbm5lY3Rpb259KVxuICB9KVxuXG59KVxuXG5cbmV4cG9ydCBkZWZhdWx0IFNRTGl0ZTNfRERMO1xuIl19