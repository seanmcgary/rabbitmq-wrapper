var RabbitMQ = require('../');

var queue = RabbitMQ.createServer({
	hostname: 'localhost',
	port: 5672
});


queue.createExchange({
	name: 'test-exchange.com'
})
.then(function(exchange){
	console.log(exchange);
})

