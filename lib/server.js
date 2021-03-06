'use strict';

let _ = require('lodash');
let promise = require('bluebird');
let amqp = require('amqp');
let logwrangler = require('logwrangler');
let Events = require('events');


let Helpers = require('./helpers');
let Exchange = require('./exchange');
let Queue = require('./queue');

const validConnectionParams = [
	'url',
	'login',
	'password',
	'connectionTimeout',
	'authMechanism',
	'vhost',
	'noDelay',
	'ssl'
];

const validConnectionOptions = [
	'reconnect',
	'reconnectBackoffStrategy',
	'reconnectBackoffTime'
];


function Server(config){
	let self = this;
	config = _.defaults(config || {}, {
		hostname: 'localhost',
		port: 5672
	});

	let options = _.defaults(config.options || {}, {
		reconnect: true,
		reconnectBackoffStrategy: 'linear',
		// tries for 2 minutes max
		reconnectExponentialLimit: 120000,
		reconnectBackoffTime: 1000
	});


	if(!config.url || !config.url.length){
		config.url = ['amqp://', [config.hostname, config.port].join(':')].join('');
	}

	self.config = config;

	self.logger = logwrangler.create({
		logOptions: { ns: config.exchangeName }
	}, true);
	self.exchanges = {};
	self.queues = {};

	var connectionConfig = _.pick(config, validConnectionParams);
	var connectionOptions = _.pick(options, validConnectionOptions);

	self.connection = amqp.createConnection(connectionConfig, connectionOptions);
	self.connected = false;

	self.setConnectionPromise();
	self.connection.on('ready', function(){
		self.connected = true;
		self.connectionDeferred.resolve(self.connection);
		self.logger.success({
			message: 'connection ready'
		});

		self.emit('resumeProcessing');
	});

	self.connection.on('error', function(err){
		if(!self.connected){
			return;
		}
		self.logger.error({
			message: 'server connection error',
			data: { error: err }
		});
		// reset the promise
		self.setConnectionPromise();
		self.connected = false;

		self.emit('pauseProcessing');

	});

	self.connection.on('end', function(){
		self.setConnectionPromise();
		self.connected = false;

		self.emit('pauseProcessing');
	});

	if(_.isArray(config.connections) && config.connections.length){
		_.each(config.connections, function(connection){

			var exchangeData = _.pick(connection, ['name', 'options']);

			if(connection.queues && connection.queues.length){
				_.each(connection.queues, function(queue){
					self.createQueue(exchangeData, queue);
				});
			} else {
				self.createExchange(exchangeData);
			}
		});
	};
};

Server.prototype = Object.create(Events.prototype);

Server.prototype.setConnectionPromise = function(){
	this.connectionDeferred = Helpers.defer();
	this.connectionPromise = this.connectionDeferred.promise;
};

Server.prototype.getConnection = function(){
	var self = this;

	return this.connectionPromise;
};

Server.prototype.getExchange = function(exchangeName, createIfNotExists, exchangeData){
	var exchange = this.exchanges[exchangeName];

	if(!createIfNotExists){
		return exchange;
	}

	return this.createExchange(exchangeData);
};

Server.prototype.createExchange = function(exchangeData){
	var self = this;
	exchangeData = exchangeData || {};

	if(!exchangeData.name || !exchangeData.name.length){
		exchangeData.name = 'amqp.default';
	}

	exchangeData.options = exchangeData.options || {};

	var exchange = self.getExchange(exchangeData.name);
	if(exchange){
		return exchange;
	}

	self.exchanges[exchangeData.name] = new Exchange(self, exchangeData.name, exchangeData.options);
	return self.exchanges[exchangeData.name];
};

Server.prototype.createQueue = function(exchangeData, queueData){
	var self = this;
	exchangeData = exchangeData || {};
	queueData = queueData || {};

	var exchange = self.getExchange(exchangeData.name, true, exchangeData);

	var queueKey = [exchangeData.name, queueData.name].join('/');
	if(self.queues[queueKey]){
		return self.queues[queueKey];
	}

	var queue = new Queue(self, exchange, queueData);
	self.queues[queueKey] = queue;
	return queue;
};

Server.prototype.getQueue = function(exchangeName, queueName){
	var self = this;
	var queueKey = [exchangeName, queueName].join('/');

	return self.queues[queueKey];
};

module.exports = Server;

