var _ = require('lodash');
var async = require('async');
var promise = require('bluebird');
var Events = require('events');

var Helpers = require('./helpers');


function Queue(server, exchange, queueData){
	var self = this;

	self.name = queueData.name;
	self.route = queueData.route;
	self.server = server;
	self.exchange = exchange;
	self.queue = null;
	self.bound = false;
	self.subscriptionHandler = null;

	self.setupBufferQueue();
	self.setQueuePromise();

	self.server.getConnection()
	.then(function(connection){
		connection.queue(self.name, {
			durable: true, 
			autoDelete: false
		}, function(queue){
			self.server.logger.success({
				message: 'connected to queue',
				data: { name: self.name }
			});
			self.queue = queue;
			self.queueDeferred.resolve();
			self.bufferQueue.resume();
		});
	});
};

Queue.prototype = Object.create(Events.prototype);

Queue.prototype.setupBufferQueue = function(){
	var self = this;

	self.bufferQueue = async.queue(function(data, cb){
		self.publish(data)
		.then(function(){
			cb()
		});
	});
	self.bufferQueue.pause();

	self.bufferQueue.drain = function(){
		self.server.logger.info({
			message: 'buffer queue drained',
			data: {
				length: self.bufferQueue.length()
			}
		});
		self.emit('drain');
	};

	self.server.on('pauseProcessing', function(){
		self.bufferQueue.pause();
		self.server.logger.warn({
			message: 'queue processing paused',
			data: { name: self.name }
		});
		self.emit('paused');
	});
	self.server.on('resumeProcessing', function(){
		self.bufferQueue.resume();
		self.server.logger.info({
			message: 'queue processing resumed',
			data: { name: self.name }
		});
		self.emit('resumed');
	});
};

Queue.prototype.setQueuePromise = function(){
	this.queueDeferred = Helpers.defer();
	this.queuePromise = this.queueDeferred.promise;
};


Queue.prototype.getQueue = function(){
	return this.queuePromise;
};

Queue.prototype.bind = function(){
	var self = this;

	return self.queuePromise
	.then(function(){
		if(self.bound){
			return promise.resolve();
		}
		return self.exchange.getExchange()
		.then(function(exchange){
			var deferred = Helpers.defer();

			self.queue.bind(exchange.exchange, self.route, function(){
				self.server.logger.success({
					message: 'queue bound',
					data: { name: self.name }
				});
				self.bound = true;
			});
		});
	});
};

Queue.prototype.enqueue = function(data){
	var self = this;
	data = data || {};

	self.bufferQueue.push(data);

	if(self.bufferQueue.paused){
		self.server.logger.warn({
			message: 'queue paused, buffering message',
			data : { name: self.name }
		});
	}
	self.emit('enqueue');
};

Queue.prototype.publish = function(data){
	var self = this;

	return self.bind()
	.then(function(){
		return new promise(function(resolve, reject){
			self.exchange.exchange.publish(self.route, JSON.stringify(data || {}), {
				contentType: 'application/json'
			}, function(err){
				if(err){
					resolve();
					return self.server.logger.error({
						message: 'failed to publish message',
						data: { error: err }
					});
				}
				resolve();
				return self.server.logger.info({
					message: 'message published',
					data: data
				});
			});
		});
	});
};

Queue.prototype.setSubscriptionHandler = function(handler){
	var self = this;

	if(typeof handler === 'function'){
		self.subscriptionHandler = handler;
	}
};

Queue.prototype.subscribe = function(handler){
	var self = this;

	if(handler){
		self.setSubscriptionHandler(handler);
	}

	self.bind()
	.then(function(){
		if(typeof self.subscriptionHandler !== 'function'){
			self.server.logger.warn({
				message: 'queue lacks subscription handler',
				data: { name: self.name }
			});
			return;
		}
		self.queue.subscribe({ ack: true, prefetchCount: 1 }, function(message, headers, deliveryInfo, ack){
			self.subscriptionHandler.apply(self, [message, headers, deliveryInfo, function(){
				ack.acknowledge();
			}]);
		});
	});
}





module.exports = Queue;