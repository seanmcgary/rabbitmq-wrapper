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
	],
	options: {
		reconnect: true
	}
});


var Q = queue.getQueue('dev.testqueue.com', 'my-test-queue');

var drainTimeout;
Q.on('drain', function(){
	clearTimeout(drainTimeout);
	console.log('drained, waiting 5 seconds');
	drainTimeout = setTimeout(function(){
		console.log('drained, exiting');
		console.log(Q.bufferQueue.length());
		process.exit();
	}, 5000);
});
Q.on('enqueue', function(){
	clearTimeout(drainTimeout);
})

var i = 0;
var interval = setInterval(function(){
	Q.enqueue({ test: i });
	i++;
	return;
	if(i > 50){
		clearInterval(interval);
	}
}, 2000);



