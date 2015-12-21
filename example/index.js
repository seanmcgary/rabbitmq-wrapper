'use strict';

let Queue = require('../');

let queue = new Queue();

setInterval(function(){

	queue.publishToQueue('test-queue-of-doom', {
		foo: 'bar'
	}, true);
}, 5000);