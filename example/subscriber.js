var RabbitMQ = require('../');

var queue = RabbitMQ.createServer({
	hostname: 'localhost',
	port: 5672,
	connectionTimeout: 1000,
	connections: [
		{
			name: 'dev.testqueue.com',
			queues: [
				{
					name: 'my-test-queue',
					route: 'my-test-queue'
				}
			]
		}
	]
});


var Q = queue.getQueue('dev.testqueue.com', 'my-test-queue');


Q.subscribe(function(message, headers, deliveryInfo, ack){
	this.server.logger.info({
		message: 'message received',
		data: message
	});
	ack();
});
setInterval(function(){

}, 5000);
