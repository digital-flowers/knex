'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {'default': obj};
}

var _queryBuilder = require('./query/builder');

var _queryBuilder2 = _interopRequireDefault(_queryBuilder);

var _raw = require('./raw');

var _raw2 = _interopRequireDefault(_raw);

// Valid values for the `order by` clause generation.
var orderBys = ['asc', 'desc'];

// Turn this into a lookup map
var operators = ['=', '<', '>', '<=', '>=', '<>', '!=', 'like', 'not like', 'between', 'ilike', '&', '|', '^', '<<', '>>', 'rlike', 'regexp', 'not regexp', '~', '~*', '!~', '!~*', '#', '&&', '@>', '<@', '||'];

function Formatter(client) {
    this.client = client;
    this.bindings = [];
}

var dash = require('./dash');

dash.override(Formatter.prototype, {

    // Accepts a string or array of columns to wrap as appropriate.
    columnize: function columnize(target) {
        var columns = typeof target === 'string' ? [target] : target;
        var str = '',
            i = -1;
        while (++i < columns.length) {
            if (i > 0) str += ', ';
            str += this.wrap(columns[i]);
        }
        return str;
    },

    // Turns a list of values into a list of ?'s, joining them with commas unless
    // a "joining" value is specified (e.g. ' and ')
    parameterize: function parameterize(values, notSetValue) {
        if (typeof values === 'function') return this.parameter(values);
        values = Array.isArray(values) ? values : [values];
        var str = '',
            i = -1;
        while (++i < values.length) {
            if (i > 0) str += ', ';
            str += this.parameter(values[i] === undefined ? notSetValue : values[i]);
        }
        return str;
    },

    // Checks whether a value is a function... if it is, we compile it
    // otherwise we check whether it's a raw
    parameter: function parameter(value) {
        if (typeof value === 'function') {
            return this.outputQuery(this.compileCallback(value), true);
        }
        return this.unwrapRaw(value, true) || '?';
    },

    unwrapRaw: function unwrapRaw(value, isParameter) {
        var query = undefined;
        if (value instanceof _queryBuilder2['default']) {
            query = this.client.queryCompiler(value).toSQL();
            if (query.bindings) {
                this.bindings = this.bindings.concat(query.bindings);
            }
            return this.outputQuery(query, isParameter);
        }
        if (value instanceof _raw2['default']) {
            value.client = this.client;
            query = value.toSQL();
            if (query.bindings) {
                this.bindings = this.bindings.concat(query.bindings);
            }
            return query.sql;
        }
        if (isParameter) {
            this.bindings.push(value);
        }
    },

    rawOrFn: function rawOrFn(value, method) {
        if (typeof value === 'function') {
            return this.outputQuery(this.compileCallback(value, method));
        }
        return this.unwrapRaw(value) || '';
    },

    // Puts the appropriate wrapper around a value depending on the database
    // engine, unless it's a knex.raw value, in which case it's left alone.
    wrap: function wrap(value) {
        if (typeof value === 'function') {
            return this.outputQuery(this.compileCallback(value), true);
        }
        var raw = this.unwrapRaw(value);
        if (raw) return raw;
        if (typeof value === 'number') return value;
        return this._wrapString(value + '');
    },

    wrapAsIdentifier: function wrapAsIdentifier(value) {
        return this.client.wrapIdentifier((value || '').trim());
    },

    alias: function alias(first, second) {
        return first + ' as ' + second;
    },

    // The operator method takes a value and returns something or other.
    operator: function operator(value) {
        var raw = this.unwrapRaw(value);
        if (raw) return raw;
        if (operators.indexOf(value.toLowerCase()) < 0) {
            throw new TypeError('The operator "' + value + '" is not permitted');
        }
        return value;
    },

    // Specify the direction of the ordering.
    direction: function direction(value) {
        var raw = this.unwrapRaw(value);
        if (raw) return raw;
        return orderBys.indexOf((value || '').toLowerCase()) !== -1 ? value : 'asc';
    },

    // Compiles a callback using the query builder.
    compileCallback: function compileCallback(callback, method) {
        var client = this.client;

        // Build the callback
        var builder = client.queryBuilder();
        callback.call(builder, builder);

        // Compile the callback, using the current formatter (to track all bindings).
        var compiler = client.queryCompiler(builder);
        compiler.formatter = this;

        // Return the compiled & parameterized sql.
        return compiler.toSQL(method || 'select');
    },

    // Ensures the query is aliased if necessary.
    outputQuery: function outputQuery(compiled, isParameter) {
        var sql = compiled.sql || '';
        if (sql) {
            if (compiled.method === 'select' && (isParameter || compiled.as)) {
                sql = '(' + sql + ')';
                if (compiled.as) return this.alias(sql, this.wrap(compiled.as));
            }
        }
        return sql;
    },

    // Coerce to string to prevent strange errors when it's not a string.
    _wrapString: function _wrapString(value) {
        var asIndex = value.toLowerCase().indexOf(' as ');
        if (asIndex !== -1) {
            var first = value.slice(0, asIndex);
            var second = value.slice(asIndex + 4);
            return this.alias(this.wrap(first), this.wrapAsIdentifier(second));
        }
        var wrapped = [];
        var i = -1;
        var segments = value.split('.');
        while (++i < segments.length) {
            value = segments[i];
            if (i === 0 && segments.length > 1) {
                wrapped.push(this.wrap((value || '').trim()));
            } else {
                wrapped.push(this.client.wrapIdentifier((value || '').trim()));
            }
        }
        return wrapped.join('.');
    }

});

exports['default'] = Formatter;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;base64,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LElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztPQUNoRTtLQUNGO0FBQ0QsV0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0dBQzFCOztDQUVGLENBQUMsQ0FBQzs7cUJBRVksU0FBUyIsImZpbGUiOiJmb3JtYXR0ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCBRdWVyeUJ1aWxkZXIgZnJvbSAnLi9xdWVyeS9idWlsZGVyJztcbmltcG9ydCBSYXcgZnJvbSAnLi9yYXcnO1xuXG5pbXBvcnQgeyBhc3NpZ24sIHRyYW5zZm9ybSB9IGZyb20gJ2xvZGFzaCdcblxuLy8gVmFsaWQgdmFsdWVzIGZvciB0aGUgYG9yZGVyIGJ5YCBjbGF1c2UgZ2VuZXJhdGlvbi5cbmNvbnN0IG9yZGVyQnlzID0gWydhc2MnLCAnZGVzYyddO1xuXG4vLyBUdXJuIHRoaXMgaW50byBhIGxvb2t1cCBtYXBcbmNvbnN0IG9wZXJhdG9ycyA9IHRyYW5zZm9ybShbXG4gICc9JywgJzwnLCAnPicsICc8PScsICc+PScsICc8PicsICchPScsICdsaWtlJyxcbiAgJ25vdCBsaWtlJywgJ2JldHdlZW4nLCAnaWxpa2UnLCAnJicsICd8JywgJ14nLCAnPDwnLCAnPj4nLFxuICAncmxpa2UnLCAncmVnZXhwJywgJ25vdCByZWdleHAnLCAnficsICd+KicsICchficsICchfionLFxuICAnIycsICcmJicsICdAPicsICc8QCcsICd8fCdcbl0sIChyZXN1bHQsIGtleSkgPT4ge1xuICByZXN1bHRba2V5XSA9IHRydWVcbn0sIHt9KTtcblxuZnVuY3Rpb24gRm9ybWF0dGVyKGNsaWVudCkge1xuICB0aGlzLmNsaWVudCA9IGNsaWVudFxuICB0aGlzLmJpbmRpbmdzID0gW11cbn1cblxuYXNzaWduKEZvcm1hdHRlci5wcm90b3R5cGUsIHtcblxuICAvLyBBY2NlcHRzIGEgc3RyaW5nIG9yIGFycmF5IG9mIGNvbHVtbnMgdG8gd3JhcCBhcyBhcHByb3ByaWF0ZS5cbiAgY29sdW1uaXplKHRhcmdldCkge1xuICAgIGNvbnN0IGNvbHVtbnMgPSB0eXBlb2YgdGFyZ2V0ID09PSAnc3RyaW5nJyA/IFt0YXJnZXRdIDogdGFyZ2V0XG4gICAgbGV0IHN0ciA9ICcnLCBpID0gLTE7XG4gICAgd2hpbGUgKCsraSA8IGNvbHVtbnMubGVuZ3RoKSB7XG4gICAgICBpZiAoaSA+IDApIHN0ciArPSAnLCAnXG4gICAgICBzdHIgKz0gdGhpcy53cmFwKGNvbHVtbnNbaV0pXG4gICAgfVxuICAgIHJldHVybiBzdHJcbiAgfSxcblxuICAvLyBUdXJucyBhIGxpc3Qgb2YgdmFsdWVzIGludG8gYSBsaXN0IG9mID8ncywgam9pbmluZyB0aGVtIHdpdGggY29tbWFzIHVubGVzc1xuICAvLyBhIFwiam9pbmluZ1wiIHZhbHVlIGlzIHNwZWNpZmllZCAoZS5nLiAnIGFuZCAnKVxuICBwYXJhbWV0ZXJpemUodmFsdWVzLCBub3RTZXRWYWx1ZSkge1xuICAgIGlmICh0eXBlb2YgdmFsdWVzID09PSAnZnVuY3Rpb24nKSByZXR1cm4gdGhpcy5wYXJhbWV0ZXIodmFsdWVzKTtcbiAgICB2YWx1ZXMgPSBBcnJheS5pc0FycmF5KHZhbHVlcykgPyB2YWx1ZXMgOiBbdmFsdWVzXTtcbiAgICBsZXQgc3RyID0gJycsIGkgPSAtMTtcbiAgICB3aGlsZSAoKytpIDwgdmFsdWVzLmxlbmd0aCkge1xuICAgICAgaWYgKGkgPiAwKSBzdHIgKz0gJywgJ1xuICAgICAgc3RyICs9IHRoaXMucGFyYW1ldGVyKHZhbHVlc1tpXSA9PT0gdW5kZWZpbmVkID8gbm90U2V0VmFsdWUgOiB2YWx1ZXNbaV0pXG4gICAgfVxuICAgIHJldHVybiBzdHI7XG4gIH0sXG5cbiAgLy8gQ2hlY2tzIHdoZXRoZXIgYSB2YWx1ZSBpcyBhIGZ1bmN0aW9uLi4uIGlmIGl0IGlzLCB3ZSBjb21waWxlIGl0XG4gIC8vIG90aGVyd2lzZSB3ZSBjaGVjayB3aGV0aGVyIGl0J3MgYSByYXdcbiAgcGFyYW1ldGVyKHZhbHVlKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHRoaXMub3V0cHV0UXVlcnkodGhpcy5jb21waWxlQ2FsbGJhY2sodmFsdWUpLCB0cnVlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMudW53cmFwUmF3KHZhbHVlLCB0cnVlKSB8fCAnPyc7XG4gIH0sXG5cbiAgdW53cmFwUmF3KHZhbHVlLCBpc1BhcmFtZXRlcikge1xuICAgIGxldCBxdWVyeTtcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBRdWVyeUJ1aWxkZXIpIHtcbiAgICAgIHF1ZXJ5ID0gdGhpcy5jbGllbnQucXVlcnlDb21waWxlcih2YWx1ZSkudG9TUUwoKVxuICAgICAgaWYgKHF1ZXJ5LmJpbmRpbmdzKSB7XG4gICAgICAgIHRoaXMuYmluZGluZ3MgPSB0aGlzLmJpbmRpbmdzLmNvbmNhdChxdWVyeS5iaW5kaW5ncyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5vdXRwdXRRdWVyeShxdWVyeSwgaXNQYXJhbWV0ZXIpO1xuICAgIH1cbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBSYXcpIHtcbiAgICAgIHZhbHVlLmNsaWVudCA9IHRoaXMuY2xpZW50O1xuICAgICAgcXVlcnkgPSB2YWx1ZS50b1NRTCgpXG4gICAgICBpZiAocXVlcnkuYmluZGluZ3MpIHtcbiAgICAgICAgdGhpcy5iaW5kaW5ncyA9IHRoaXMuYmluZGluZ3MuY29uY2F0KHF1ZXJ5LmJpbmRpbmdzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBxdWVyeS5zcWxcbiAgICB9XG4gICAgaWYgKGlzUGFyYW1ldGVyKSB7XG4gICAgICB0aGlzLmJpbmRpbmdzLnB1c2godmFsdWUpO1xuICAgIH1cbiAgfSxcblxuICByYXdPckZuKHZhbHVlLCBtZXRob2QpIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gdGhpcy5vdXRwdXRRdWVyeSh0aGlzLmNvbXBpbGVDYWxsYmFjayh2YWx1ZSwgbWV0aG9kKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnVud3JhcFJhdyh2YWx1ZSkgfHwgJyc7XG4gIH0sXG5cbiAgLy8gUHV0cyB0aGUgYXBwcm9wcmlhdGUgd3JhcHBlciBhcm91bmQgYSB2YWx1ZSBkZXBlbmRpbmcgb24gdGhlIGRhdGFiYXNlXG4gIC8vIGVuZ2luZSwgdW5sZXNzIGl0J3MgYSBrbmV4LnJhdyB2YWx1ZSwgaW4gd2hpY2ggY2FzZSBpdCdzIGxlZnQgYWxvbmUuXG4gIHdyYXAodmFsdWUpIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gdGhpcy5vdXRwdXRRdWVyeSh0aGlzLmNvbXBpbGVDYWxsYmFjayh2YWx1ZSksIHRydWUpO1xuICAgIH1cbiAgICBjb25zdCByYXcgPSB0aGlzLnVud3JhcFJhdyh2YWx1ZSk7XG4gICAgaWYgKHJhdykgcmV0dXJuIHJhdztcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykgcmV0dXJuIHZhbHVlO1xuICAgIHJldHVybiB0aGlzLl93cmFwU3RyaW5nKHZhbHVlICsgJycpO1xuICB9LFxuXG4gIHdyYXBBc0lkZW50aWZpZXIodmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5jbGllbnQud3JhcElkZW50aWZpZXIoKHZhbHVlIHx8ICcnKS50cmltKCkpO1xuICB9LFxuXG4gIGFsaWFzKGZpcnN0LCBzZWNvbmQpIHtcbiAgICByZXR1cm4gZmlyc3QgKyAnIGFzICcgKyBzZWNvbmQ7XG4gIH0sXG5cbiAgLy8gVGhlIG9wZXJhdG9yIG1ldGhvZCB0YWtlcyBhIHZhbHVlIGFuZCByZXR1cm5zIHNvbWV0aGluZyBvciBvdGhlci5cbiAgb3BlcmF0b3IodmFsdWUpIHtcbiAgICBjb25zdCByYXcgPSB0aGlzLnVud3JhcFJhdyh2YWx1ZSk7XG4gICAgaWYgKHJhdykgcmV0dXJuIHJhdztcbiAgICBpZiAob3BlcmF0b3JzWyh2YWx1ZSB8fCAnJykudG9Mb3dlckNhc2UoKV0gIT09IHRydWUpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFRoZSBvcGVyYXRvciBcIiR7dmFsdWV9XCIgaXMgbm90IHBlcm1pdHRlZGApO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG4gIH0sXG5cbiAgLy8gU3BlY2lmeSB0aGUgZGlyZWN0aW9uIG9mIHRoZSBvcmRlcmluZy5cbiAgZGlyZWN0aW9uKHZhbHVlKSB7XG4gICAgY29uc3QgcmF3ID0gdGhpcy51bndyYXBSYXcodmFsdWUpO1xuICAgIGlmIChyYXcpIHJldHVybiByYXc7XG4gICAgcmV0dXJuIG9yZGVyQnlzLmluZGV4T2YoKHZhbHVlIHx8ICcnKS50b0xvd2VyQ2FzZSgpKSAhPT0gLTEgPyB2YWx1ZSA6ICdhc2MnO1xuICB9LFxuXG4gIC8vIENvbXBpbGVzIGEgY2FsbGJhY2sgdXNpbmcgdGhlIHF1ZXJ5IGJ1aWxkZXIuXG4gIGNvbXBpbGVDYWxsYmFjayhjYWxsYmFjaywgbWV0aG9kKSB7XG4gICAgY29uc3QgeyBjbGllbnQgfSA9IHRoaXM7XG5cbiAgICAvLyBCdWlsZCB0aGUgY2FsbGJhY2tcbiAgICBjb25zdCBidWlsZGVyID0gY2xpZW50LnF1ZXJ5QnVpbGRlcigpO1xuICAgIGNhbGxiYWNrLmNhbGwoYnVpbGRlciwgYnVpbGRlcik7XG5cbiAgICAvLyBDb21waWxlIHRoZSBjYWxsYmFjaywgdXNpbmcgdGhlIGN1cnJlbnQgZm9ybWF0dGVyICh0byB0cmFjayBhbGwgYmluZGluZ3MpLlxuICAgIGNvbnN0IGNvbXBpbGVyID0gY2xpZW50LnF1ZXJ5Q29tcGlsZXIoYnVpbGRlcik7XG4gICAgY29tcGlsZXIuZm9ybWF0dGVyID0gdGhpcztcblxuICAgIC8vIFJldHVybiB0aGUgY29tcGlsZWQgJiBwYXJhbWV0ZXJpemVkIHNxbC5cbiAgICByZXR1cm4gY29tcGlsZXIudG9TUUwobWV0aG9kIHx8ICdzZWxlY3QnKTtcbiAgfSxcblxuICAvLyBFbnN1cmVzIHRoZSBxdWVyeSBpcyBhbGlhc2VkIGlmIG5lY2Vzc2FyeS5cbiAgb3V0cHV0UXVlcnkoY29tcGlsZWQsIGlzUGFyYW1ldGVyKSB7XG4gICAgbGV0IHNxbCA9IGNvbXBpbGVkLnNxbCB8fCAnJztcbiAgICBpZiAoc3FsKSB7XG4gICAgICBpZiAoY29tcGlsZWQubWV0aG9kID09PSAnc2VsZWN0JyAmJiAoaXNQYXJhbWV0ZXIgfHwgY29tcGlsZWQuYXMpKSB7XG4gICAgICAgIHNxbCA9IGAoJHtzcWx9KWA7XG4gICAgICAgIGlmIChjb21waWxlZC5hcykgcmV0dXJuIHRoaXMuYWxpYXMoc3FsLCB0aGlzLndyYXAoY29tcGlsZWQuYXMpKVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3FsO1xuICB9LFxuXG4gIC8vIENvZXJjZSB0byBzdHJpbmcgdG8gcHJldmVudCBzdHJhbmdlIGVycm9ycyB3aGVuIGl0J3Mgbm90IGEgc3RyaW5nLlxuICBfd3JhcFN0cmluZyh2YWx1ZSkge1xuICAgIGNvbnN0IGFzSW5kZXggPSB2YWx1ZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YoJyBhcyAnKTtcbiAgICBpZiAoYXNJbmRleCAhPT0gLTEpIHtcbiAgICAgIGNvbnN0IGZpcnN0ID0gdmFsdWUuc2xpY2UoMCwgYXNJbmRleClcbiAgICAgIGNvbnN0IHNlY29uZCA9IHZhbHVlLnNsaWNlKGFzSW5kZXggKyA0KVxuICAgICAgcmV0dXJuIHRoaXMuYWxpYXModGhpcy53cmFwKGZpcnN0KSwgdGhpcy53cmFwQXNJZGVudGlmaWVyKHNlY29uZCkpXG4gICAgfVxuICAgIGNvbnN0IHdyYXBwZWQgPSBbXTtcbiAgICBsZXQgaSA9IC0xO1xuICAgIGNvbnN0IHNlZ21lbnRzID0gdmFsdWUuc3BsaXQoJy4nKTtcbiAgICB3aGlsZSAoKytpIDwgc2VnbWVudHMubGVuZ3RoKSB7XG4gICAgICB2YWx1ZSA9IHNlZ21lbnRzW2ldO1xuICAgICAgaWYgKGkgPT09IDAgJiYgc2VnbWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICB3cmFwcGVkLnB1c2godGhpcy53cmFwKCh2YWx1ZSB8fCAnJykudHJpbSgpKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB3cmFwcGVkLnB1c2godGhpcy5jbGllbnQud3JhcElkZW50aWZpZXIoKHZhbHVlIHx8ICcnKS50cmltKCkpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHdyYXBwZWQuam9pbignLicpO1xuICB9XG5cbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBGb3JtYXR0ZXI7XG4iXX0=