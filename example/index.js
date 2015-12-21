'use strict';

let Queue = require('../');

let queue = new Queue();

setInterval(function(){

	queue.publishToQueue('test-queue-of-doom', {
		foo: 'bar'
	}, true);
}, 2000);


queue.getQueue('test-queue-of-doom')
.then((queue) => {
	queue.subscribe((message, headers, deliveryInfo, messageObject) => {
		console.log(message);
		messageObject.acknowledge();
	});
})