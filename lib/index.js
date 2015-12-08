/**
 * Created by seanmcgary on 12/7/15.
 */
'use strict';
let _ = require('lodash');

let Connection = require('./connection');

function Rabbit(){
	return new (Function.prototype.bind.apply(Connection, _.values(arguments)));
};

Rabbit.Connection = Connection;

module.exports = Rabbit;