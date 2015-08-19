var _ = require('lodash');
var promise = require('bluebird');
var amqp = require('amqp');
var logwrangler = require('logwrangler');
var Events = require('events');


var Exchange = require('./exchange');

var validConnectionParams = [
	'url',
	'login',
	'password',
	'connectionTimeout',
	'authMechanism',
	'vhost',
	'noDelay',
	'ssl'
];

var defer = function(){
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

function Server(config){
	var self = this;
	config = _.defaults(config || {}, {
		hostname: 'localhost',
		port: 5672
	});

	if(!config.url || !config.url.length){
		config.url = ['amqp://', [config.hostname, config.port].join(':')].join('');
	}

	self.config = config;

	self.logger = logwrangler.create({
		logOptions: { ns: config.exchangeName }
	}, true);
	self.exchanges = {};

	self.connection = amqp.createConnection(_.pick(config, validConnectionParams));
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
		// reset the promise
		self.setConnectionPromise();
		self.connected = false;

		self.logger.error({
			message: 'connection error',
			data: { error: err }
		});

		self.emit('pauseProcessing');

	});
};

Server.prototype = Object.create(Events.prototype);

Server.prototype.setConnectionPromise = function(){
	this.connectionDeferred = defer();
	this.connectionPromise = this.connectionDeferred.promise;
};

Server.prototype.getConnection = function(){
	var self = this;

	return this.connectionPromise;
};

Server.prototype.getExchange = function(exchangeName){
	return this.exchanges[exchangeName];
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

module.exports = Server;

