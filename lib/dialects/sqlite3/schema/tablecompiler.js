'use strict';

exports.__esModule = true;

function _interopRequireWildcard(obj) {
    if (obj && obj.__esModule) {
        return obj;
    } else {
        var newObj = {};
        if (obj != null) {
            for (var key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];
            }
        }
        newObj['default'] = obj;
        return newObj;
    }
}

function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {'default': obj};
}

var _inherits = require('inherits');

var _inherits2 = _interopRequireDefault(_inherits);

var _schemaTablecompiler = require('../../../schema/tablecompiler');

var _schemaTablecompiler2 = _interopRequireDefault(_schemaTablecompiler);

var _helpers = require('../../../helpers');

var helpers = _interopRequireWildcard(_helpers);

// Table Compiler
// -------

function TableCompiler_SQLite3() {
    _schemaTablecompiler2['default'].apply(this, arguments);
    this.primaryKey = void 0;
}
_inherits2['default'](TableCompiler_SQLite3, _schemaTablecompiler2['default']);

// Create a new table.
TableCompiler_SQLite3.prototype.createQuery = function (columns, ifNot) {
    var createStatement = ifNot ? 'create table if not exists ' : 'create table ';
    var sql = createStatement + this.tableName() + ' (' + columns.sql.join(', ');

    // SQLite forces primary keys to be added when the table is initially created
    // so we will need to check for a primary key commands and add the columns
    // to the table's declaration here so they can be created on the tables.
    sql += this.foreignKeys() || '';
    sql += this.primaryKeys() || '';
    sql += ')';

    this.pushQuery(sql);
};

TableCompiler_SQLite3.prototype.addColumns = function (columns) {
    for (var i = 0, l = columns.sql.length; i < l; i++) {
        this.pushQuery({
            sql: 'alter table ' + this.tableName() + ' add column ' + columns.sql[i],
            bindings: columns.bindings[i]
        });
    }
};

// Compile a drop unique key command.
TableCompiler_SQLite3.prototype.dropUnique = function (columns, indexName) {
    indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand('unique', this.tableNameRaw, columns);
    this.pushQuery('drop index ' + indexName);
};

TableCompiler_SQLite3.prototype.dropIndex = function (columns, indexName) {
    indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand('index', this.tableNameRaw, columns);
    this.pushQuery('drop index ' + indexName);
};

// Compile a unique key command.
TableCompiler_SQLite3.prototype.unique = function (columns, indexName) {
    indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand('unique', this.tableNameRaw, columns);
    columns = this.formatter.columnize(columns);
    this.pushQuery('create unique index ' + indexName + ' on ' + this.tableName() + ' (' + columns + ')');
};

// Compile a plain index key command.
TableCompiler_SQLite3.prototype.index = function (columns, indexName) {
    indexName = indexName ? this.formatter.wrap(indexName) : this._indexCommand('index', this.tableNameRaw, columns);
    columns = this.formatter.columnize(columns);
    this.pushQuery('create index ' + indexName + ' on ' + this.tableName() + ' (' + columns + ')');
};

TableCompiler_SQLite3.prototype.primary = TableCompiler_SQLite3.prototype.foreign = function () {
    if (this.method !== 'create' && this.method !== 'createIfNot') {
        helpers.warn('SQLite3 Foreign & Primary keys may only be added on create');
    }
};

TableCompiler_SQLite3.prototype.primaryKeys = function () {
    var pks = (this.grouped.alterTable || []).filter(function (item) {
        return item.method == 'primary';
    });
    if (pks.length > 0 && pks[0].args.length > 0) {
        var args = Array.isArray(pks[0].args[0]) ? pks[0].args[0] : pks[0].args;
        return ', primary key (' + this.formatter.columnize(args) + ')';
    }
};

TableCompiler_SQLite3.prototype.foreignKeys = function () {
    var sql = '';
    var foreignKeys = (this.grouped.alterTable || []).filter(function (item) {
        return item.method == 'foreign';
    });
    for (var i = 0, l = foreignKeys.length; i < l; i++) {
        var foreign = foreignKeys[i].args[0];
        var column = this.formatter.columnize(foreign.column);
        var references = this.formatter.columnize(foreign.references);
        var foreignTable = this.formatter.wrap(foreign.inTable);
        sql += ', foreign key(' + column + ') references ' + foreignTable + '(' + references + ')';
        if (foreign.onDelete) sql += ' on delete ' + foreign.onDelete;
        if (foreign.onUpdate) sql += ' on update ' + foreign.onUpdate;
    }
    return sql;
};

TableCompiler_SQLite3.prototype.createTableBlock = function () {
    return this.getColumns().concat().join(',');
};

// Compile a rename column command... very complex in sqlite
TableCompiler_SQLite3.prototype.renameColumn = function (from, to) {
    var compiler = this;
    this.pushQuery({
        sql: 'PRAGMA table_info(' + this.tableName() + ')',
        output: function output(pragma) {
            return compiler.client.ddl(compiler, pragma, this.connection).renameColumn(from, to);
        }
    });
};

TableCompiler_SQLite3.prototype.dropColumn = function (column) {
    var compiler = this;
    this.pushQuery({
        sql: 'PRAGMA table_info(' + this.tableName() + ')',
        output: function output(pragma) {
            return compiler.client.ddl(compiler, pragma, this.connection).dropColumn(column);
        }
    });
};

exports['default'] = TableCompiler_SQLite3;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9kaWFsZWN0cy9zcWxpdGUzL3NjaGVtYS90YWJsZWNvbXBpbGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O3dCQUFxQixVQUFVOzs7O21DQUNMLCtCQUErQjs7Ozt1QkFDaEMsa0JBQWtCOztJQUEvQixPQUFPOztzQkFFSSxRQUFROzs7OztBQUsvQixTQUFTLHFCQUFxQixHQUFHO0FBQy9CLG1DQUFjLEtBQUssQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDckMsTUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUMsQ0FBQztDQUMxQjtBQUNELHNCQUFTLHFCQUFxQixtQ0FBZ0IsQ0FBQzs7O0FBRy9DLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsVUFBUyxPQUFPLEVBQUUsS0FBSyxFQUFFO0FBQ3JFLE1BQU0sZUFBZSxHQUFHLEtBQUssR0FBRyw2QkFBNkIsR0FBRyxlQUFlLENBQUM7QUFDaEYsTUFBSSxHQUFHLEdBQUcsZUFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxJQUFJLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Ozs7O0FBSzdFLEtBQUcsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDO0FBQ2hDLEtBQUcsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDO0FBQ2hDLEtBQUcsSUFBSSxHQUFHLENBQUM7O0FBRVgsTUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztDQUNyQixDQUFDOztBQUVGLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxVQUFVLEdBQUcsVUFBUyxPQUFPLEVBQUU7QUFDN0QsT0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FB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R0FBRyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztLQUNsRjtHQUNGLENBQUMsQ0FBQztDQUNKLENBQUM7O3FCQUVhLHFCQUFxQiIsImZpbGUiOiJ0YWJsZWNvbXBpbGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGluaGVyaXRzIGZyb20gJ2luaGVyaXRzJztcbmltcG9ydCBUYWJsZUNvbXBpbGVyIGZyb20gJy4uLy4uLy4uL3NjaGVtYS90YWJsZWNvbXBpbGVyJztcbmltcG9ydCAqIGFzIGhlbHBlcnMgZnJvbSAnLi4vLi4vLi4vaGVscGVycyc7XG5cbmltcG9ydCB7IGZpbHRlciB9IGZyb20gJ2xvZGFzaCdcblxuLy8gVGFibGUgQ29tcGlsZXJcbi8vIC0tLS0tLS1cblxuZnVuY3Rpb24gVGFibGVDb21waWxlcl9TUUxpdGUzKCkge1xuICBUYWJsZUNvbXBpbGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIHRoaXMucHJpbWFyeUtleSA9IHZvaWQgMDtcbn1cbmluaGVyaXRzKFRhYmxlQ29tcGlsZXJfU1FMaXRlMywgVGFibGVDb21waWxlcik7XG5cbi8vIENyZWF0ZSBhIG5ldyB0YWJsZS5cblRhYmxlQ29tcGlsZXJfU1FMaXRlMy5wcm90b3R5cGUuY3JlYXRlUXVlcnkgPSBmdW5jdGlvbihjb2x1bW5zLCBpZk5vdCkge1xuICBjb25zdCBjcmVhdGVTdGF0ZW1lbnQgPSBpZk5vdCA/ICdjcmVhdGUgdGFibGUgaWYgbm90IGV4aXN0cyAnIDogJ2NyZWF0ZSB0YWJsZSAnO1xuICBsZXQgc3FsID0gY3JlYXRlU3RhdGVtZW50ICsgdGhpcy50YWJsZU5hbWUoKSArICcgKCcgKyBjb2x1bW5zLnNxbC5qb2luKCcsICcpO1xuXG4gIC8vIFNRTGl0ZSBmb3JjZXMgcHJpbWFyeSBrZXlzIHRvIGJlIGFkZGVkIHdoZW4gdGhlIHRhYmxlIGlzIGluaXRpYWxseSBjcmVhdGVkXG4gIC8vIHNvIHdlIHdpbGwgbmVlZCB0byBjaGVjayBmb3IgYSBwcmltYXJ5IGtleSBjb21tYW5kcyBhbmQgYWRkIHRoZSBjb2x1bW5zXG4gIC8vIHRvIHRoZSB0YWJsZSdzIGRlY2xhcmF0aW9uIGhlcmUgc28gdGhleSBjYW4gYmUgY3JlYXRlZCBvbiB0aGUgdGFibGVzLlxuICBzcWwgKz0gdGhpcy5mb3JlaWduS2V5cygpIHx8ICcnO1xuICBzcWwgKz0gdGhpcy5wcmltYXJ5S2V5cygpIHx8ICcnO1xuICBzcWwgKz0gJyknO1xuXG4gIHRoaXMucHVzaFF1ZXJ5KHNxbCk7XG59O1xuXG5UYWJsZUNvbXBpbGVyX1NRTGl0ZTMucHJvdG90eXBlLmFkZENvbHVtbnMgPSBmdW5jdGlvbihjb2x1bW5zKSB7XG4gIGZvciAobGV0IGkgPSAwLCBsID0gY29sdW1ucy5zcWwubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgdGhpcy5wdXNoUXVlcnkoe1xuICAgICAgc3FsOiBgYWx0ZXIgdGFibGUgJHt0aGlzLnRhYmxlTmFtZSgpfSBhZGQgY29sdW1uICR7Y29sdW1ucy5zcWxbaV19YCxcbiAgICAgIGJpbmRpbmdzOiBjb2x1bW5zLmJpbmRpbmdzW2ldXG4gICAgfSk7XG4gIH1cbn07XG5cbi8vIENvbXBpbGUgYSBkcm9wIHVuaXF1ZSBrZXkgY29tbWFuZC5cblRhYmxlQ29tcGlsZXJfU1FMaXRlMy5wcm90b3R5cGUuZHJvcFVuaXF1ZSA9IGZ1bmN0aW9uKGNvbHVtbnMsIGluZGV4TmFtZSkge1xuICBpbmRleE5hbWUgPSBpbmRleE5hbWVcbiAgICA/IHRoaXMuZm9ybWF0dGVyLndyYXAoaW5kZXhOYW1lKVxuICAgIDogdGhpcy5faW5kZXhDb21tYW5kKCd1bmlxdWUnLCB0aGlzLnRhYmxlTmFtZVJhdywgY29sdW1ucyk7XG4gIHRoaXMucHVzaFF1ZXJ5KGBkcm9wIGluZGV4ICR7aW5kZXhOYW1lfWApO1xufTtcblxuVGFibGVDb21waWxlcl9TUUxpdGUzLnByb3RvdHlwZS5kcm9wSW5kZXggPSBmdW5jdGlvbihjb2x1bW5zLCBpbmRleE5hbWUpIHtcbiAgaW5kZXhOYW1lID0gaW5kZXhOYW1lXG4gICAgPyB0aGlzLmZvcm1hdHRlci53cmFwKGluZGV4TmFtZSlcbiAgICA6IHRoaXMuX2luZGV4Q29tbWFuZCgnaW5kZXgnLCB0aGlzLnRhYmxlTmFtZVJhdywgY29sdW1ucyk7XG4gIHRoaXMucHVzaFF1ZXJ5KGBkcm9wIGluZGV4ICR7aW5kZXhOYW1lfWApO1xufTtcblxuLy8gQ29tcGlsZSBhIHVuaXF1ZSBrZXkgY29tbWFuZC5cblRhYmxlQ29tcGlsZXJfU1FMaXRlMy5wcm90b3R5cGUudW5pcXVlID0gZnVuY3Rpb24oY29sdW1ucywgaW5kZXhOYW1lKSB7XG4gIGluZGV4TmFtZSA9IGluZGV4TmFtZVxuICAgID8gdGhpcy5mb3JtYXR0ZXIud3JhcChpbmRleE5hbWUpXG4gICAgOiB0aGlzLl9pbmRleENvbW1hbmQoJ3VuaXF1ZScsIHRoaXMudGFibGVOYW1lUmF3LCBjb2x1bW5zKTtcbiAgY29sdW1ucyA9IHRoaXMuZm9ybWF0dGVyLmNvbHVtbml6ZShjb2x1bW5zKTtcbiAgdGhpcy5wdXNoUXVlcnkoYGNyZWF0ZSB1bmlxdWUgaW5kZXggJHtpbmRleE5hbWV9IG9uICR7dGhpcy50YWJsZU5hbWUoKX0gKCR7Y29sdW1uc30pYCk7XG59O1xuXG4vLyBDb21waWxlIGEgcGxhaW4gaW5kZXgga2V5IGNvbW1hbmQuXG5UYWJsZUNvbXBpbGVyX1NRTGl0ZTMucHJvdG90eXBlLmluZGV4ID0gZnVuY3Rpb24oY29sdW1ucywgaW5kZXhOYW1lKSB7XG4gIGluZGV4TmFtZSA9IGluZGV4TmFtZVxuICAgID8gdGhpcy5mb3JtYXR0ZXIud3JhcChpbmRleE5hbWUpXG4gICAgOiB0aGlzLl9pbmRleENvbW1hbmQoJ2luZGV4JywgdGhpcy50YWJsZU5hbWVSYXcsIGNvbHVtbnMpO1xuICBjb2x1bW5zID0gdGhpcy5mb3JtYXR0ZXIuY29sdW1uaXplKGNvbHVtbnMpO1xuICB0aGlzLnB1c2hRdWVyeShgY3JlYXRlIGluZGV4ICR7aW5kZXhOYW1lfSBvbiAke3RoaXMudGFibGVOYW1lKCl9ICgke2NvbHVtbnN9KWApO1xufTtcblxuVGFibGVDb21waWxlcl9TUUxpdGUzLnByb3RvdHlwZS5wcmltYXJ5ID1cblRhYmxlQ29tcGlsZXJfU1FMaXRlMy5wcm90b3R5cGUuZm9yZWlnbiA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5tZXRob2QgIT09ICdjcmVhdGUnICYmIHRoaXMubWV0aG9kICE9PSAnY3JlYXRlSWZOb3QnKSB7XG4gICAgaGVscGVycy53YXJuKCdTUUxpdGUzIEZvcmVpZ24gJiBQcmltYXJ5IGtleXMgbWF5IG9ubHkgYmUgYWRkZWQgb24gY3JlYXRlJyk7XG4gIH1cbn07XG5cblRhYmxlQ29tcGlsZXJfU1FMaXRlMy5wcm90b3R5cGUucHJpbWFyeUtleXMgPSBmdW5jdGlvbigpIHtcbiAgY29uc3QgcGtzID0gZmlsdGVyKHRoaXMuZ3JvdXBlZC5hbHRlclRhYmxlIHx8IFtdLCB7bWV0aG9kOiAncHJpbWFyeSd9KTtcbiAgaWYgKHBrcy5sZW5ndGggPiAwICYmIHBrc1swXS5hcmdzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBhcmdzID0gQXJyYXkuaXNBcnJheShwa3NbMF0uYXJnc1swXSkgPyBwa3NbMF0uYXJnc1swXSA6IHBrc1swXS5hcmdzO1xuICAgIHJldHVybiBgLCBwcmltYXJ5IGtleSAoJHt0aGlzLmZvcm1hdHRlci5jb2x1bW5pemUoYXJncyl9KWA7XG4gIH1cbn07XG5cblRhYmxlQ29tcGlsZXJfU1FMaXRlMy5wcm90b3R5cGUuZm9yZWlnbktleXMgPSBmdW5jdGlvbigpIHtcbiAgbGV0IHNxbCA9ICcnO1xuICBjb25zdCBmb3JlaWduS2V5cyA9IGZpbHRlcih0aGlzLmdyb3VwZWQuYWx0ZXJUYWJsZSB8fCBbXSwge21ldGhvZDogJ2ZvcmVpZ24nfSk7XG4gIGZvciAobGV0IGkgPSAwLCBsID0gZm9yZWlnbktleXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgY29uc3QgZm9yZWlnbiA9IGZvcmVpZ25LZXlzW2ldLmFyZ3NbMF07XG4gICAgY29uc3QgY29sdW1uID0gdGhpcy5mb3JtYXR0ZXIuY29sdW1uaXplKGZvcmVpZ24uY29sdW1uKTtcbiAgICBjb25zdCByZWZlcmVuY2VzID0gdGhpcy5mb3JtYXR0ZXIuY29sdW1uaXplKGZvcmVpZ24ucmVmZXJlbmNlcyk7XG4gICAgY29uc3QgZm9yZWlnblRhYmxlID0gdGhpcy5mb3JtYXR0ZXIud3JhcChmb3JlaWduLmluVGFibGUpO1xuICAgIHNxbCArPSBgLCBmb3JlaWduIGtleSgke2NvbHVtbn0pIHJlZmVyZW5jZXMgJHtmb3JlaWduVGFibGV9KCR7cmVmZXJlbmNlc30pYDtcbiAgICBpZiAoZm9yZWlnbi5vbkRlbGV0ZSkgc3FsICs9IGAgb24gZGVsZXRlICR7Zm9yZWlnbi5vbkRlbGV0ZX1gO1xuICAgIGlmIChmb3JlaWduLm9uVXBkYXRlKSBzcWwgKz0gYCBvbiB1cGRhdGUgJHtmb3JlaWduLm9uVXBkYXRlfWA7XG4gIH1cbiAgcmV0dXJuIHNxbDtcbn07XG5cblRhYmxlQ29tcGlsZXJfU1FMaXRlMy5wcm90b3R5cGUuY3JlYXRlVGFibGVCbG9jayA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5nZXRDb2x1bW5zKCkuY29uY2F0KCkuam9pbignLCcpO1xufTtcblxuLy8gQ29tcGlsZSBhIHJlbmFtZSBjb2x1bW4gY29tbWFuZC4uLiB2ZXJ5IGNvbXBsZXggaW4gc3FsaXRlXG5UYWJsZUNvbXBpbGVyX1NRTGl0ZTMucHJvdG90eXBlLnJlbmFtZUNvbHVtbiA9IGZ1bmN0aW9uKGZyb20sIHRvKSB7XG4gIGNvbnN0IGNvbXBpbGVyID0gdGhpcztcbiAgdGhpcy5wdXNoUXVlcnkoe1xuICAgIHNxbDogYFBSQUdNQSB0YWJsZV9pbmZvKCR7dGhpcy50YWJsZU5hbWUoKX0pYCxcbiAgICBvdXRwdXQocHJhZ21hKSB7XG4gICAgICByZXR1cm4gY29tcGlsZXIuY2xpZW50LmRkbChjb21waWxlciwgcHJhZ21hLCB0aGlzLmNvbm5lY3Rpb24pLnJlbmFtZUNvbHVtbihmcm9tLCB0byk7XG4gICAgfVxuICB9KTtcbn07XG5cblRhYmxlQ29tcGlsZXJfU1FMaXRlMy5wcm90b3R5cGUuZHJvcENvbHVtbiA9IGZ1bmN0aW9uKGNvbHVtbikge1xuICBjb25zdCBjb21waWxlciA9IHRoaXM7XG4gIHRoaXMucHVzaFF1ZXJ5KHtcbiAgICBzcWw6IGBQUkFHTUEgdGFibGVfaW5mbygke3RoaXMudGFibGVOYW1lKCl9KWAsXG4gICAgb3V0cHV0KHByYWdtYSkge1xuICAgICAgcmV0dXJuIGNvbXBpbGVyLmNsaWVudC5kZGwoY29tcGlsZXIsIHByYWdtYSwgdGhpcy5jb25uZWN0aW9uKS5kcm9wQ29sdW1uKGNvbHVtbik7XG4gICAgfVxuICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IFRhYmxlQ29tcGlsZXJfU1FMaXRlMztcbiJdfQ==