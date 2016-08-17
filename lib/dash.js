var idCounter = 0;

var dash = {
    omit: function (obj, keys) {
        keys = keys || [];
        var obj2 = {};
        Object.keys(obj).forEach(function (key) {
            if (keys.indexOf(key) < 0) {
                obj2[key] = obj[key];
            }
        });
        return obj2;
    },
    omitBy: function (obj, val) {
        var obj2 = {};
        Object.keys(obj).forEach(function (key) {
            if (obj[key] != val) {
                obj2[key] = val;
            }
        });
        return obj2;
    },
    override: function (baseObject, overrideObject, createNew) {
        baseObject = baseObject || {};
        overrideObject = overrideObject || {};
        if (createNew) {
            baseObject = JSON.parse(JSON.stringify(baseObject));
        }
        Object.keys(overrideObject).forEach(function (key) {
            if (dash.isObjectAndNotArray(baseObject[key]) && dash.isObjectAndNotArray(overrideObject[key])) {
                dash.override(baseObject[key], overrideObject[key]);
            }
            else {
                baseObject[key] = overrideObject[key];
            }
        });
        return baseObject;
    },
    identity: function (value) {
        return value;
    },
    isNumber: function (value) {
        return typeof value == 'number' || value instanceof Number;
    },
    toArray: function (args) {
        return Array.prototype.slice.apply(args);
    },
    isObject: function (value) {
        // Avoid a V8 JIT bug in Chrome 19-20.
        // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
        var type = typeof value;
        return !!value && (type == 'object' || type == 'function');
    },
    isEmpty: function (values) {
        return !values || values.length <= 0;
    },
    isBoolean: function (value) {
        return value == true || value == false;
    },
    isString: function (value) {
        return typeof value == 'string';
    },
    first: function (array) {
        return array ? array[0] : undefined;
    },
    tail: function (array) {
        var arr = array;
        arr.shift();
        return arr;
    },
    groupBy: function (list, keyGetter) {
        var map = {};
        list.forEach(function (item) {
            var key = item[keyGetter];
            map[key] = map[key] || [];
            map[key].push(item);
        });
        return map;
    },
    compact: function (array) {
        var index = -1,
            length = array ? array.length : 0,
            resIndex = -1,
            result = [];

        while (++index < length) {
            var value = array[index];
            if (value) {
                result[++resIndex] = value;
            }
        }
        return result;
    },
    baseToString: function (value) {
        return value == null ? '' : (value + '');
    },
    uniqueId: function (prefix) {
        var id = ++idCounter;
        return dash.baseToString(prefix) + id;
    },
    pickByArray: function (object, props) {
        object = dash.toObject(object);
        var index = -1,
            length = props.length,
            result = {};

        while (++index < length) {
            var key = props[index];
            if (key in object) {
                result[key] = object[key];
            }
        }
        return result;
    },
    toObject: function (value) {
        return dash.isObject(value) ? value : Object(value);
    },
    isObjectAndNotArray: function (object) {
        return (typeof object === 'object' && !Array.isArray(object));
    }
};

module.exports = dash;