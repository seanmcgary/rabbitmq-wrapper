var _ = require('lodash');
var promise = require('bluebird');

function Queue(name, connection){
	var self = this;
	self.name = name;
	self.connection = connection;
	self.queue = null;
	self.routes = {};

	var connectionDeferred = q.defer();
	self.connectedPromise = connectionDeferred.promise;

	self.connection.queue(name, {
		durable: true,
		autoDelete: false
	}, function(queue){
		self.queue = queue;
		connectionDeferred.resolve(queue);
	});
};

Queue.prototype.connected = function(){
	var self = this;

	return self.connectedPromise;
};

Queue.prototype.bind = function(exchange, routeName){
	var self = this;

	return self.connected()
	.then(function(queue){

		if(self.routes[routeName]){
			return self.routes[routeName];
		}

		var routeDeferred = q.defer();
		self.routes[routeName] = routeDeferred.promise;
		queue.bind(exchange, routeName, function(){
			routeDeferred.resolve();
		});
		return self.routes[routeName];
	});
};

Queue.prototype.subscribe = function(options, handler){
	var self = this;

	self.connected()
	.then(function(queue){
		queue.subscribe(options, function(message, headers, deliveryInfo, ack){
			handler(message, headers, deliveryInfo, function(){
				ack.acknowledge();
			});
		});
	});
};