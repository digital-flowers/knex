// Column Compiler
// Used for designating column definitions
// during the table "create" / "alter" statements.
// -------
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

var _raw = require('../raw');

var _raw2 = _interopRequireDefault(_raw);

var _helpers = require('./helpers');

var helpers = _interopRequireWildcard(_helpers);

var dash = require('../dash');

function isObject(value) {
    // Avoid a V8 JIT bug in Chrome 19-20.
    // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
    var type = typeof value;
    return !!value && (type == 'object' || type == 'function');
}

function ColumnCompiler(client, tableCompiler, columnBuilder) {
    this.client = client;
    this.tableCompiler = tableCompiler;
    this.columnBuilder = columnBuilder;
    this.args = columnBuilder._args;
    this.type = columnBuilder._type.toLowerCase();
    this.grouped = dash.groupBy(columnBuilder._statements, 'grouping');
    this.modified = columnBuilder._modifiers;
    this.isIncrements = this.type.indexOf('increments') !== -1;
    this.formatter = client.formatter();
    this.sequence = [];
}

ColumnCompiler.prototype.pushQuery = helpers.pushQuery;

ColumnCompiler.prototype.pushAdditional = helpers.pushAdditional;

// To convert to sql, we first go through and build the
// column as it would be in the insert statement
ColumnCompiler.prototype.toSQL = function () {
    this.pushQuery(this.compileColumn());
    if (this.sequence.additional) {
        this.sequence = this.sequence.concat(this.sequence.additional);
    }
    return this.sequence;
};

// Compiles a column.
ColumnCompiler.prototype.compileColumn = function () {
    return this.formatter.wrap(this.getColumnName()) + ' ' + this.getColumnType() + this.getModifiers();
};

// Assumes the autoincrementing key is named `id` if not otherwise specified.
ColumnCompiler.prototype.getColumnName = function () {
    var value = dash.first(this.args);
    if (value) return value;
    if (this.isIncrements) {
        return 'id';
    } else {
        throw new Error('You did not specify a column name for the ' + this.type + 'column.');
    }
};

ColumnCompiler.prototype.getColumnType = function () {
    var type = this[this.type];
    return typeof type === 'function' ? type.apply(this, dash.tail(this.args)) : type;
};

ColumnCompiler.prototype.getModifiers = function () {
    var modifiers = [];
    if (this.type.indexOf('increments') === -1) {
        for (var i = 0, l = this.modifiers.length; i < l; i++) {
            var modifier = this.modifiers[i];
            if (this.modified[modifier]) {
                var val = this[modifier].apply(this, this.modified[modifier]);
                if (val) modifiers.push(val);
            }
        }
    }
    return modifiers.length > 0 ? ' ' + modifiers.join(' ') : '';
};

// Types
// ------

ColumnCompiler.prototype.increments = 'integer not null primary key autoincrement';
ColumnCompiler.prototype.bigincrements = 'integer not null primary key autoincrement';
ColumnCompiler.prototype.integer = ColumnCompiler.prototype.smallint = ColumnCompiler.prototype.mediumint = 'integer';
ColumnCompiler.prototype.biginteger = 'bigint';
ColumnCompiler.prototype.varchar = function (length) {
    return 'varchar(' + this._num(length, 255) + ')';
};
ColumnCompiler.prototype.text = 'text';
ColumnCompiler.prototype.tinyint = 'tinyint';
ColumnCompiler.prototype.floating = function (precision, scale) {
    return 'float(' + this._num(precision, 8) + ', ' + this._num(scale, 2) + ')';
};
ColumnCompiler.prototype.decimal = function (precision, scale) {
    return 'decimal(' + this._num(precision, 8) + ', ' + this._num(scale, 2) + ')';
};
ColumnCompiler.prototype.binary = 'blob';
ColumnCompiler.prototype.bool = 'boolean';
ColumnCompiler.prototype.date = 'date';
ColumnCompiler.prototype.datetime = 'datetime';
ColumnCompiler.prototype.time = 'time';
ColumnCompiler.prototype.timestamp = 'timestamp';
ColumnCompiler.prototype.enu = 'varchar';

ColumnCompiler.prototype.bit = ColumnCompiler.prototype.json = 'text';

ColumnCompiler.prototype.uuid = 'char(36)';
ColumnCompiler.prototype.specifictype = function (type) {
    return type;
};

// Modifiers
// -------

ColumnCompiler.prototype.nullable = function (nullable) {
    return nullable === false ? 'not null' : 'null';
};
ColumnCompiler.prototype.notNullable = function () {
    return this.nullable(false);
};
ColumnCompiler.prototype.defaultTo = function (value) {
    if (value === void 0) {
        return '';
    } else if (value === null) {
        value = "null";
    } else if (value instanceof _raw2['default']) {
        value = value.toQuery();
    } else if (this.type === 'bool') {
        if (value === 'false') value = 0;
        value = '\'' + (value ? 1 : 0) + '\'';
    } else if (this.type === 'json' && isObject(value)) {
        return JSON.stringify(value);
    } else {
        value = '\'' + value + '\'';
    }
    return 'default ' + value;
};
ColumnCompiler.prototype._num = function (val, fallback) {
    if (val === undefined || val === null) return fallback;
    var number = parseInt(val, 10);
    return isNaN(number) ? fallback : number;
};

exports['default'] = ColumnCompiler;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zY2hlbWEvY29sdW1uY29tcGlsZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OzttQkFLZ0IsUUFBUTs7Ozt1QkFDQyxXQUFXOztJQUF4QixPQUFPOztzQkFDaUMsUUFBUTs7QUFFNUQsU0FBUyxjQUFjLENBQUMsTUFBTSxFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUU7QUFDNUQsTUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUE7QUFDcEIsTUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUE7QUFDbEMsTUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUE7QUFDbEMsTUFBSSxDQUFDLElBQUksR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDO0FBQ2hDLE1BQUksQ0FBQyxJQUFJLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUM5QyxNQUFJLENBQUMsT0FBTyxHQUFHLGdCQUFRLGFBQWEsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFDOUQsTUFBSSxDQUFDLFFBQVEsR0FBRyxhQUFhLENBQUMsVUFBVSxDQUFDO0FBQ3pDLE1BQUksQ0FBQyxZQUFZLEdBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLEFBQUMsQ0FBQztBQUM3RCxNQUFJLENBQUMsU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUNwQyxNQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQztDQUNwQjs7QUFFRCxjQUFjLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFBOztBQUV0RCxjQUFjLENBQUMsU0FBUyxDQUFDLGNBQWMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFBOzs7O0FBSWhFLGNBQWMsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLFlBQVc7QUFDMUMsTUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJ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RztDQUMzQixDQUFDO0FBQ0YsY0FBYyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEdBQUcsVUFBUyxHQUFHLEVBQUUsUUFBUSxFQUFFO0FBQ3RELE1BQUksR0FBRyxLQUFLLFNBQVMsSUFBSSxHQUFHLEtBQUssSUFBSSxFQUFFLE9BQU8sUUFBUSxDQUFDO0FBQ3ZELE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDakMsU0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsUUFBUSxHQUFHLE1BQU0sQ0FBQztDQUMxQyxDQUFDOztxQkFFYSxjQUFjIiwiZmlsZSI6ImNvbHVtbmNvbXBpbGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vLyBDb2x1bW4gQ29tcGlsZXJcbi8vIFVzZWQgZm9yIGRlc2lnbmF0aW5nIGNvbHVtbiBkZWZpbml0aW9uc1xuLy8gZHVyaW5nIHRoZSB0YWJsZSBcImNyZWF0ZVwiIC8gXCJhbHRlclwiIHN0YXRlbWVudHMuXG4vLyAtLS0tLS0tXG5pbXBvcnQgUmF3IGZyb20gJy4uL3Jhdyc7XG5pbXBvcnQgKiBhcyBoZWxwZXJzIGZyb20gJy4vaGVscGVycyc7XG5pbXBvcnQgeyBncm91cEJ5LCBmaXJzdCwgdGFpbCwgaGFzLCBpc09iamVjdCB9IGZyb20gJ2xvZGFzaCdcblxuZnVuY3Rpb24gQ29sdW1uQ29tcGlsZXIoY2xpZW50LCB0YWJsZUNvbXBpbGVyLCBjb2x1bW5CdWlsZGVyKSB7XG4gIHRoaXMuY2xpZW50ID0gY2xpZW50XG4gIHRoaXMudGFibGVDb21waWxlciA9IHRhYmxlQ29tcGlsZXJcbiAgdGhpcy5jb2x1bW5CdWlsZGVyID0gY29sdW1uQnVpbGRlclxuICB0aGlzLmFyZ3MgPSBjb2x1bW5CdWlsZGVyLl9hcmdzO1xuICB0aGlzLnR5cGUgPSBjb2x1bW5CdWlsZGVyLl90eXBlLnRvTG93ZXJDYXNlKCk7XG4gIHRoaXMuZ3JvdXBlZCA9IGdyb3VwQnkoY29sdW1uQnVpbGRlci5fc3RhdGVtZW50cywgJ2dyb3VwaW5nJyk7XG4gIHRoaXMubW9kaWZpZWQgPSBjb2x1bW5CdWlsZGVyLl9tb2RpZmllcnM7XG4gIHRoaXMuaXNJbmNyZW1lbnRzID0gKHRoaXMudHlwZS5pbmRleE9mKCdpbmNyZW1lbnRzJykgIT09IC0xKTtcbiAgdGhpcy5mb3JtYXR0ZXIgPSBjbGllbnQuZm9ybWF0dGVyKCk7XG4gIHRoaXMuc2VxdWVuY2UgPSBbXTtcbn1cblxuQ29sdW1uQ29tcGlsZXIucHJvdG90eXBlLnB1c2hRdWVyeSA9IGhlbHBlcnMucHVzaFF1ZXJ5XG5cbkNvbHVtbkNvbXBpbGVyLnByb3RvdHlwZS5wdXNoQWRkaXRpb25hbCA9IGhlbHBlcnMucHVzaEFkZGl0aW9uYWxcblxuLy8gVG8gY29udmVydCB0byBzcWwsIHdlIGZpcnN0IGdvIHRocm91Z2ggYW5kIGJ1aWxkIHRoZVxuLy8gY29sdW1uIGFzIGl0IHdvdWxkIGJlIGluIHRoZSBpbnNlcnQgc3RhdGVtZW50XG5Db2x1bW5Db21waWxlci5wcm90b3R5cGUudG9TUUwgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5wdXNoUXVlcnkodGhpcy5jb21waWxlQ29sdW1uKCkpO1xuICBpZiAodGhpcy5zZXF1ZW5jZS5hZGRpdGlvbmFsKSB7XG4gICAgdGhpcy5zZXF1ZW5jZSA9IHRoaXMuc2VxdWVuY2UuY29uY2F0KHRoaXMuc2VxdWVuY2UuYWRkaXRpb25hbCk7XG4gIH1cbiAgcmV0dXJuIHRoaXMuc2VxdWVuY2U7XG59O1xuXG4vLyBDb21waWxlcyBhIGNvbHVtbi5cbkNvbHVtbkNvbXBpbGVyLnByb3RvdHlwZS5jb21waWxlQ29sdW1uID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmZvcm1hdHRlci53cmFwKHRoaXMuZ2V0Q29sdW1uTmFtZSgpKSArICcgJyArXG4gICAgdGhpcy5nZXRDb2x1bW5UeXBlKCkgKyB0aGlzLmdldE1vZGlmaWVycygpO1xufTtcblxuLy8gQXNzdW1lcyB0aGUgYXV0b2luY3JlbWVudGluZyBrZXkgaXMgbmFtZWQgYGlkYCBpZiBub3Qgb3RoZXJ3aXNlIHNwZWNpZmllZC5cbkNvbHVtbkNvbXBpbGVyLnByb3RvdHlwZS5nZXRDb2x1bW5OYW1lID0gZnVuY3Rpb24oKSB7XG4gIGNvbnN0IHZhbHVlID0gZmlyc3QodGhpcy5hcmdzKTtcbiAgaWYgKHZhbHVlKSByZXR1cm4gdmFsdWU7XG4gIGlmICh0aGlzLmlzSW5jcmVtZW50cykge1xuICAgIHJldHVybiAnaWQnO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihgWW91IGRpZCBub3Qgc3BlY2lmeSBhIGNvbHVtbiBuYW1lIGZvciB0aGUgJHt0aGlzLnR5cGV9Y29sdW1uLmApO1xuICB9XG59O1xuXG5Db2x1bW5Db21waWxlci5wcm90b3R5cGUuZ2V0Q29sdW1uVHlwZSA9IGZ1bmN0aW9uKCkge1xuICBjb25zdCB0eXBlID0gdGhpc1t0aGlzLnR5cGVdO1xuICByZXR1cm4gdHlwZW9mIHR5cGUgPT09ICdmdW5jdGlvbicgPyB0eXBlLmFwcGx5KHRoaXMsIHRhaWwodGhpcy5hcmdzKSkgOiB0eXBlO1xufTtcblxuQ29sdW1uQ29tcGlsZXIucHJvdG90eXBlLmdldE1vZGlmaWVycyA9IGZ1bmN0aW9uKCkge1xuICBjb25zdCBtb2RpZmllcnMgPSBbXTtcbiAgaWYgKHRoaXMudHlwZS5pbmRleE9mKCdpbmNyZW1lbnRzJykgPT09IC0xKSB7XG4gICAgZm9yIChsZXQgaSA9IDAsIGwgPSB0aGlzLm1vZGlmaWVycy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGNvbnN0IG1vZGlmaWVyID0gdGhpcy5tb2RpZmllcnNbaV07XG4gICAgICBpZiAoaGFzKHRoaXMubW9kaWZpZWQsIG1vZGlmaWVyKSkge1xuICAgICAgICBjb25zdCB2YWwgPSB0aGlzW21vZGlmaWVyXS5hcHBseSh0aGlzLCB0aGlzLm1vZGlmaWVkW21vZGlmaWVyXSk7XG4gICAgICAgIGlmICh2YWwpIG1vZGlmaWVycy5wdXNoKHZhbCk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBtb2RpZmllcnMubGVuZ3RoID4gMCA/IGAgJHttb2RpZmllcnMuam9pbignICcpfWAgOiAnJztcbn07XG5cbi8vIFR5cGVzXG4vLyAtLS0tLS1cblxuQ29sdW1uQ29tcGlsZXIucHJvdG90eXBlLmluY3JlbWVudHMgPSAnaW50ZWdlciBub3QgbnVsbCBwcmltYXJ5IGtleSBhdXRvaW5jcmVtZW50JztcbkNvbHVtbkNvbXBpbGVyLnByb3RvdHlwZS5iaWdpbmNyZW1lbnRzID0gJ2ludGVnZXIgbm90IG51bGwgcHJpbWFyeSBrZXkgYXV0b2luY3JlbWVudCc7XG5Db2x1bW5Db21waWxlci5wcm90b3R5cGUuaW50ZWdlciAgICAgICA9XG5Db2x1bW5Db21waWxlci5wcm90b3R5cGUuc21hbGxpbnQgICAgICA9XG5Db2x1bW5Db21waWxlci5wcm90b3R5cGUubWVkaXVtaW50ID0gJ2ludGVnZXInO1xuQ29sdW1uQ29tcGlsZXIucHJvdG90eXBlLmJpZ2ludGVnZXIgPSAnYmlnaW50JztcbkNvbHVtbkNvbXBpbGVyLnByb3RvdHlwZS52YXJjaGFyID0gZnVuY3Rpb24obGVuZ3RoKSB7XG4gIHJldHVybiBgdmFyY2hhcigke3RoaXMuX251bShsZW5ndGgsIDI1NSl9KWA7XG59O1xuQ29sdW1uQ29tcGlsZXIucHJvdG90eXBlLnRleHQgPSAndGV4dCc7XG5Db2x1bW5Db21waWxlci5wcm90b3R5cGUudGlueWludCA9ICd0aW55aW50JztcbkNvbHVtbkNvbXBpbGVyLnByb3RvdHlwZS5mbG9hdGluZyA9IGZ1bmN0aW9uKHByZWNpc2lvbiwgc2NhbGUpIHtcbiAgcmV0dXJuIGBmbG9hdCgke3RoaXMuX251bShwcmVjaXNpb24sIDgpfSwgJHt0aGlzLl9udW0oc2NhbGUsIDIpfSlgO1xufTtcbkNvbHVtbkNvbXBpbGVyLnByb3RvdHlwZS5kZWNpbWFsID0gZnVuY3Rpb24ocHJlY2lzaW9uLCBzY2FsZSkge1xuICByZXR1cm4gYGRlY2ltYWwoJHt0aGlzLl9udW0ocHJlY2lzaW9uLCA4KX0sICR7dGhpcy5fbnVtKHNjYWxlLCAyKX0pYDtcbn07XG5Db2x1bW5Db21waWxlci5wcm90b3R5cGUuYmluYXJ5ID0gJ2Jsb2InO1xuQ29sdW1uQ29tcGlsZXIucHJvdG90eXBlLmJvb2wgPSAnYm9vbGVhbic7XG5Db2x1bW5Db21waWxlci5wcm90b3R5cGUuZGF0ZSA9ICdkYXRlJztcbkNvbHVtbkNvbXBpbGVyLnByb3RvdHlwZS5kYXRldGltZSA9ICdkYXRldGltZSc7XG5Db2x1bW5Db21waWxlci5wcm90b3R5cGUudGltZSA9ICd0aW1lJztcbkNvbHVtbkNvbXBpbGVyLnByb3RvdHlwZS50aW1lc3RhbXAgPSAndGltZXN0YW1wJztcbkNvbHVtbkNvbXBpbGVyLnByb3RvdHlwZS5lbnUgPSAndmFyY2hhcic7XG5cbkNvbHVtbkNvbXBpbGVyLnByb3RvdHlwZS5iaXQgPVxuQ29sdW1uQ29tcGlsZXIucHJvdG90eXBlLmpzb24gPSAndGV4dCc7XG5cbkNvbHVtbkNvbXBpbGVyLnByb3RvdHlwZS51dWlkID0gJ2NoYXIoMzYpJztcbkNvbHVtbkNvbXBpbGVyLnByb3RvdHlwZS5zcGVjaWZpY3R5cGUgPSB0eXBlID0+IHR5cGU7XG5cbi8vIE1vZGlmaWVyc1xuLy8gLS0tLS0tLVxuXG5Db2x1bW5Db21waWxlci5wcm90b3R5cGUubnVsbGFibGUgPSBudWxsYWJsZSA9PiBudWxsYWJsZSA9PT0gZmFsc2UgPyAnbm90IG51bGwnIDogJ251bGwnO1xuQ29sdW1uQ29tcGlsZXIucHJvdG90eXBlLm5vdE51bGxhYmxlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLm51bGxhYmxlKGZhbHNlKTtcbn07XG5Db2x1bW5Db21waWxlci5wcm90b3R5cGUuZGVmYXVsdFRvID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKHZhbHVlID09PSB2b2lkIDApIHtcbiAgICByZXR1cm4gJyc7XG4gIH0gZWxzZSBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICB2YWx1ZSA9IFwibnVsbFwiO1xuICB9IGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgUmF3KSB7XG4gICAgdmFsdWUgPSB2YWx1ZS50b1F1ZXJ5KCk7XG4gIH0gZWxzZSBpZiAodGhpcy50eXBlID09PSAnYm9vbCcpIHtcbiAgICBpZiAodmFsdWUgPT09ICdmYWxzZScpIHZhbHVlID0gMDtcbiAgICB2YWx1ZSA9IGAnJHt2YWx1ZSA/IDEgOiAwfSdgO1xuICB9IGVsc2UgaWYgKHRoaXMudHlwZSA9PT0gJ2pzb24nICYmIGlzT2JqZWN0KHZhbHVlKSkge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XG4gIH0gZWxzZSB7XG4gICAgdmFsdWUgPSBgJyR7dmFsdWV9J2A7XG4gIH1cbiAgcmV0dXJuIGBkZWZhdWx0ICR7dmFsdWV9YDtcbn07XG5Db2x1bW5Db21waWxlci5wcm90b3R5cGUuX251bSA9IGZ1bmN0aW9uKHZhbCwgZmFsbGJhY2spIHtcbiAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkIHx8IHZhbCA9PT0gbnVsbCkgcmV0dXJuIGZhbGxiYWNrO1xuICBjb25zdCBudW1iZXIgPSBwYXJzZUludCh2YWwsIDEwKTtcbiAgcmV0dXJuIGlzTmFOKG51bWJlcikgPyBmYWxsYmFjayA6IG51bWJlcjtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IENvbHVtbkNvbXBpbGVyO1xuIl19