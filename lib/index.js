var _ = require('lodash');
var amqp = require('amqp');
var async = require('async');
var logwrangler = require('logwrangler');

var Server = require('./server');
//var Queue = require('./queue');
//var Exchange = require('./exchange');

var serverInstances = {};

var getServerByExchangeName = exports.getServerByExchangeName = function(name){
	return serverInstances[name];
};

exports.getServers = function(){
	return serverInstances();
};

exports.createServer = function(config){
	var server = getServerByExchangeName(config.exchangeName);

	if(server){
		return server;
	}

	serverInstances[config.exchangeName] = new Server(config);
	return serverInstances[config.exchangeName];
};



exports.Server = Server;
//exports.Queue = Queue;
//exports.Exchange = Exchange;
