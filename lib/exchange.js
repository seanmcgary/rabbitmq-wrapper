var _ = require('lodash');
var promise = require('bluebird');

var validExchangeOptions = [
	'type',
	'passive',
	'durable',
	'autoDelete',
	'confirm'
];

function Exchange(server, exchangeName, exchangeOptions){
	var self = this;

	self.name = exchangeName;
	self.server = server;
	self.queues = {};
	self.exchange = null;

	self.exchangeOptions = _.defaults(exchangeOptions || {}, {
		passive: false,
		durable: true,
		autoDelete: true,
		confirm: true
	});

	self.createExchange();
}

Exchange.prototype.createExchange = function(){
	var self = this;

	return new promise(function(resolve, reject){
		self.server.getConnection()
		.then(function(connection){

			connection.exchange(self.name, self.exchangeOptions, function(exchange){
				self.exchange = exchange;
				resolve(self);
			});
		});
	});
};

Exchange.prototype.getExchange = function(){
	var self = this;
	if(self.exchange){
		return promise.resolve(self);
	}

	return self.createExchange();
};

module.exports = Exchange;




