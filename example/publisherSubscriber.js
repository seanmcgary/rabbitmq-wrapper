var RabbitMQ = require('../');

var queue = RabbitMQ.createServer({
	hostname: 'localhost',
	port: 5672,
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


//console.log('queue', queue.getQueue('dev.testqueue.com', 'my-test-queue'));

var Q = queue.getQueue('dev.testqueue.com', 'my-test-queue');

var i = 0;
setInterval(function(){
	Q.enqueue({ test: i });
	i++;
}, 1000);


