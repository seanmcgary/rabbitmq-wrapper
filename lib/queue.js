/**
 * Created by seanmcgary on 12/20/15.
 */
'use strict';

let _ = require('lodash');
let Promise = require('bluebird');
let logwrangler = require('logwrangler');
let async = require('async');

function Queue(queueName, connectionInst){
	this.queueName = queueName;
	this.connectionInst = connectionInst;

	this.queue = null;
	this.creating = false;

	this.logger = logwrangler.create({
		logOptions: { ns: ['queue', this.queueName].join('::') }
	}, true);

	this.initBuffer();

	this.connectionInst.on('connected', () => {
		if(!this.queue && !this.creating){
			this.createQueue();
		}
	});

	this.connectionInst.on('disconnected', () => {
		this.queue = null;
		this.pauseBuffer();
	});

	this.connectionInst.isConnected && this.createQueue();
};

Queue.prototype.pauseBuffer = function(){
	this.logger.warn({
		message: 'buffer paused'
	});
	this.bufferQueue.pause();
};

Queue.prototype.resumeBuffer = function(){
	this.logger.info({
		message: 'buffer resumed'
	});
	this.bufferQueue.resume();
};

Queue.prototype.initBuffer = function(){
	this.bufferQueue = async.queue((data, cb) => {

		this.connectionInst.exchange.publish(this.queueName, data, {
			contentType: 'application/json'
		}, (err) => {
			this.logger.info({
				message: 'message published to queue',
			});
			cb();
		});
	}, 1);
	this.pauseBuffer();
}

Queue.prototype.createQueue = function(){
	if(this.queue){
		return this.queue;
	}

	this.creating = true;
	this.connectionInst.connection.queue(this.queueName, {
		durable: true,
		autoDelete: false
	}, (queue) => {
		this.logger.info({
			message: 'queue created'
		});

		queue.bind(this.connectionInst.exchange, this.queueName, () => {
			this.logger.info({
				message: 'queue bound'
			});

			this.queue = queue;
			this.creating = false;
			this.resumeBuffer();
			this.initSubscription();
		});
	});
};

Queue.prototype.initSubscription = function(){
	if(typeof this.subscription !== 'function'){
		return;
	}

	this.queue.subscribe({ ack: true, prefetchCount: 1 }, (message, headers, deliveryInfo, messageObject) => {
		this.subscription(message, headers, deliveryInfo, messageObject);
	});
};

Queue.prototype.publishToQueue = function(payload){
	this.logger.info({
		message: 'publish to buffer',
		data: {
			bufferLength: this.bufferQueue.length(),
			paused: this.bufferQueue.paused
		}
	});
	this.bufferQueue.push(payload);
};

Queue.prototype.subscribe = function(handler){
	this.subscription = handler;
};

module.exports = Queue;