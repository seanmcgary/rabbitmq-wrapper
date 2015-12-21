/**
 * Created by seanmcgary on 12/20/15.
 */
'use strict';


let _ = require('lodash');
let Promise = require('bluebird');
let AMQP = require('amqp');
let EventEmitter = require('events');
let logwrangler = require('logwrangler');

let Queue = require('./queue');

function Connection(connectionOptions, queueOptions, exchangeOptions){
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

	this.queueOptions = queueOptions = _.defaults(queueOptions || {}, {
		defaultExchangeName: '',
		reconnect: true,
		reconnectBackoffStrategy: 'linear',
		reconnectExponentialLimit: 120 * 1000,
		reconnectBackoffTime: 1 * 1000,
	});

	this.exchangeOptions = exchangeOptions = _.defaults(exchangeOptions || {}, {
		name: 'queue-exchange',
		passive: false,
		durable: true,
		autoDelete: true,
		confirm: true
	});

	this.hasConnectionError = false;
	this.connection = null;

	this.logger = logwrangler.create({
		logOptions: { ns: 'rabbitmq' }
	}, true);

	this.isConnected = false;

	this.queues = {};

	this.createConnection();
};

Connection.prototype = Object.create(EventEmitter.prototype);

Connection.prototype.createConnection = function(){

	this.connection = AMQP.createConnection(this.connectionOptions, this.queueOptions);

	this.connection.on('connect', () => {
		this.logger.success({
			message: 'connected'
		});
	});

	this.connection.on('ready', () => {
		this.logger.info({
			message: 'ready'
		});

		let exchange = this.connection.exchange(this.exchangeOptions.name, _.omit(this.exchangeOptions, ['name']), (exchange) => {
			this.logger.success({
				message: 'exchange is open'
			});
			this.exchange = exchange;
			this.setConnectionState(true);
		});
	});

	this.connection.on('error', (err) => {
		this.setConnectionState(false);

		this.logger.error({
			message: 'error',
			data: { error: err }
		});
		this.hasConnectionError = true;
	});

	this.connection.on('close', () => {
		this.setConnectionState(false);

		this.logger.warn({
			message: 'close'
		});

		if(!this.hasConnectionError){
			this.reconnect();
		}
		this.hasConnectionError = false;
	});

	this.connection.on('end', () => {
		this.setConnectionState(false);

		this.logger.info({
			message: 'end'
		});
	});
};

Connection.prototype.reconnect = function(){
	this.logger.info({
		message: 'forcing reconnect'
	});
	this.createConnection();
};

Connection.prototype.setConnectionState = function(connected){
	let hasStateChanged = connected != this.isConnected;

	this.isConnected = !!connected;
	let state = this.isConnected ? 'connected' : 'disconnected';

	hasStateChanged && this.emit(state);
};

Connection.prototype.getQueue = function(queueName, createIfNotExists){
	let queue = this.queues[queueName];

	if(queue){
		return Promise.resolve(queue);
	}

	queue = new Queue(queueName, this);
	this.queues[queueName] = queue;
	return Promise.resolve(queue);
};

Connection.prototype.publishToQueue = function(queueName, payload, createIfNotExists){
	return this.getQueue(queueName, createIfNotExists)
	.then((queue) => {
		queue.publishToQueue(payload);
	});
};

module.exports = Connection;



