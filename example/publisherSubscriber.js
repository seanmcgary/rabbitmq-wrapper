var RabbitMQ = require('../');

var queue = RabbitMQ.createServer({
	hostname: 'localhost',
	port: 5672
});

console.log(queue);