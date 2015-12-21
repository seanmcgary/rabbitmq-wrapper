/**
 * Created by seanmcgary on 12/7/15.
 */
'use strict';

let _ = require('lodash');
let Promise = require('bluebird');
let AMQP = require('amqp');
let logwrangler = require('logwrangler');
let EventEmitter = require('events');

function Connection(connectionOptions, rabbitOptions, config){
	this.connectionOptions = connectionOptions = _.defaults(connectionOptions || {}, {
		host: '127.0.0.1',
		port: 5672,
		authMechanism: 'AMQPLAIN',
		login: 'guest',
		password: 'guest',
		vhost: '/',
		noDelay: true,
		heartbeat: 2
	});

	this.rabbitOptions = rabbitOptions = _.defaults(rabbitOptions || {}, {
		defaultExchangeName: '',
		reconnect: true,
		reconnectBackoffStrategy: 'linear',
		reconnectExponentialLimit: 120 * 1000,
		reconnectBackoffTime: 1 * 1000,
	});

	this.config = config = _.defaults(config || {}, {
		bufferConcurrency: 1
	});

	this.queues = {};
	this.isConnected = false;

	this.logger = logwrangler.create({
		logOptions: { ns: 'rabbitmq' }
	}, true);

	this.createConnection();
};

Connection.prototype = Object.create(EventEmitter.prototype);

Connection.prototype.createConnection = function(){
	this.connection = AMQP.createConnection(this.connectionOptions, this.rabbitOptions);

	this.connection.on('connect', () => {
		this.logger.info({
			message: 'connect'
		});
		this.setConnectionState(true);
	});

	this.connection.on('error', (err) => {
		this.logger.error({
			message: 'error',
			data: { error: err }
		});
		this.hasConnectionError = true;
		this.setConnectionState(false);
	});

	this.connection.on('end', () => {
		this.logger.warn({
			message: 'end'
		});
		this.setConnectionState(false);
	});

	this.connection.on('close', () => {
		this.logger.info({
			message: 'close'
		});

		this.setConnectionState(false);
		if(!this.hasConnectionError){
			this.reconnect();
		}
		this.hasConnectionError = false;

	});

	this.connection.on('timeout', () => {
		this.logger.error({
			message: 'timeout'
		});
	});
};

Connection.prototype.reconnect = function(){
	// last ditch effort to reconnect by re-creating the connection
	clearTimeout(this.reconnectTimout);
	this.reconnectTimout = setTimeout(() => {
		this.logger.warn({
			message: 'attempting manual reconnection'
		});
		this.createConnection();
	}, this.rabbitOptions.reconnectBackoffTime);
};

Connection.prototype.setConnectionState = function(connected){
	let state = (connected ? 'connected' : 'disconnected');

	this.emit(state);
};

Connection.prototype.getQueue = function(queueName, createOnGet){
	let self = this;

	return new Promise(function(resolve, reject){
		let queue = self.queues[queueName];

		if(queue){
			return resolve(queue);
		}

		if(createOnGet){
			return resolve(self.createQueue(queueName));
		}

		return reject(new Error('queue not found'));
	});
};

Connection.prototype.createQueue = function(queueName){

};

Connection.prototype.publishToQueue = function(queueName, exchangeName, payload){
	let self = this;

	return new Promise(function(resolve, reject){
		if(_.isPlainObject(exchangeName)){
			payload = exchangeName;
			exchangeName = null;
		}

		if(!_.isString(queueName) || !queueName.length){
			return reject(new Error('please provide a queue name'));
		}

		return self.getQueue(queueName)
		.then(function(queue){
			return queue.publish(payload);
		})
		.catch(reject);
	});
};

module.exports = Connection;