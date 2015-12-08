/**
 * Created by seanmcgary on 12/7/15.
 */
'use strict';

let _ = require('lodash');
let Promise = require('bluebird');
let logwrangler = require('logwrangler');
let EventEmitter = require('events');
let async = require('async');

function Queue(queueName, connection){
	this.queueName = queueName;
	this.connection = connection;

	this.queueOptions = {
		durable: true,
		autoDelete: false
	};

	this.logger = logwrangler.create({
		logOptions: {
			ns: [connection.logger.logOptions.ns, queueName].join('::')
		}
	}, true);

	connection.on('connected', () => {

	});

	connection.on('disconnected', () => {
		this.queue = null;
	});

	this.initBuffer();
};

Queue.prototype = Object.create(EventEmitter.prototype);

// create the queue
Queue.prototype.createQueue = function(){
	let self = this;

	return self.connection.isConnectionReady()
	.then(function(){

		return new Promise(function(resolve, reject){
			self.connection.queue(self.queueName, self.queueOptions, function(queue){
				if(!queue){
					return reject(queue);
				}
				self.queue = queue;
				return resolve(queue);
			});
		});
	});
};

// get the reference to the queue object
Queue.prototype.getQueue = function(){
	if(this.queue){
		return Promise.resolve(this.queue);
	}

	// if its not created yet, create it
	return this.createQueue();
};

Queue.prototype.isQueueReady = function(){
	return this.getQueue();
};

Queue.prototype.initBuffer = function(){
	this.buffer = async.queue((payload, cb) => {

		this.publish(payload)
		.then(() => {
			cb();
		})
		.catch((err) => {
			this.logger.error({
				data: { error: err }
			});
		});

	}, this.connection.config.bufferConcurrency || 1);

	this.buffer.drain = (){
		this.emit('bufferDrained');
	};
};

Queue.prototype.publish = function(payload){
	let self = this;
	payload = payload || {};

	return this.isQueueReady()
	.then(function(){

		return new Promise(function(resolve, reject){

			self.connection.publish(self.queueName, payload, {

			}, function(err){
				if(err){
					return reject(err);
				}

				resolve();
			});
		});

	});
};

Queue.prototype.enqueue = function(payload){
	let self = this;

};