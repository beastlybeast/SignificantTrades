
const WebSocket = require('ws');
const Axios = require('axios');
const Server = require('./src/Server');

const Kraken = require('./src/exchanges/Kraken');
const Bitmex = require('./src/exchanges/Bitmex');

new Server({
	port: 3000,
	exchanges: [
		new Kraken(),
		new Bitmex()
	]
});