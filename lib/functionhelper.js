
// FunctionHelper
// -------
'use strict';

exports.__esModule = true;
function FunctionHelper(client) {
  this.client = client;
}

FunctionHelper.prototype.now = function () {
  return this.client.raw('CURRENT_TIMESTAMP');
};

exports['default'] = FunctionHelper;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9mdW5jdGlvbmhlbHBlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFHQSxTQUFTLGNBQWMsQ0FBQyxNQUFNLEVBQUU7QUFDOUIsTUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUE7Q0FDckI7O0FBRUQsY0FBYyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUcsWUFBVztBQUN4QyxTQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUE7Q0FDNUMsQ0FBQTs7cUJBRWMsY0FBYyIsImZpbGUiOiJmdW5jdGlvbmhlbHBlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuLy8gRnVuY3Rpb25IZWxwZXJcbi8vIC0tLS0tLS1cbmZ1bmN0aW9uIEZ1bmN0aW9uSGVscGVyKGNsaWVudCkge1xuICB0aGlzLmNsaWVudCA9IGNsaWVudFxufVxuXG5GdW5jdGlvbkhlbHBlci5wcm90b3R5cGUubm93ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmNsaWVudC5yYXcoJ0NVUlJFTlRfVElNRVNUQU1QJylcbn1cblxuZXhwb3J0IGRlZmF1bHQgRnVuY3Rpb25IZWxwZXJcbiJdfQ==