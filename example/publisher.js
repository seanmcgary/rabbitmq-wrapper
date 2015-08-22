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


var Q = queue.getQueue('dev.testqueue.com', 'my-test-queue');

var drainTimeout;
Q.on('drain', function(){
	clearTimeout(drainTimeout);
	console.log('drained, waiting 5 seconds');
	drainTimeout = setTimeout(function(){
		process.exit();
	}, 5000);
});

var i = 0;
var interval = setInterval(function(){
	Q.enqueue({ test: i });
	i++;
	if(i > 50){
		clearInterval(interval);
	}
}, 200);

setInterval(function(){

}, 5000);



