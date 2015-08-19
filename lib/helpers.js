var promise = require('bluebird');

var defer = exports.defer = function(){
	var resolve;
	var reject;

	var p = new promise(function(){
		resolve = arguments[0];
		reject = arguments[1];
	});
	return {
		promise: p,
		resolve: resolve,
		reject: reject
	};
};