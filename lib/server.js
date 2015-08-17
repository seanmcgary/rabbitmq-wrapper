var _ = require('lodash');
var promise = require('bluebird');
var amqp = require('amqp');
var logwrangler = require('logwrangler');
var Events = require('events');

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
	self.queues = {};
	self.exchanges = {};

	self.connection = amqp.createConnection(_.pick(config, validConnectionParams));
	self.connected = false;

	self.connection.on('ready', function(){
		self.connected = true;
		self.logger.success({
			message: 'connection ready'
		});

		self.emit('resumeProcessing');
	});

	self.connection.on('error', function(err){
		self.connected = false;

		self.logger.error({
			message: 'connection error',
			data: { error: err }
		});

		self.emit('pauseProcessing');
	});
};

Server.prototype = Object.create(Events.prototype);

module.exports = Server;

