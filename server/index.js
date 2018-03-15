
const WebSocket = require('ws');
const Axios = require('axios');
const Server = require('./src/Server');

const config = require('./config');

const Kraken = require('./src/exchanges/Kraken');
const Bitmex = require('./src/exchanges/Bitmex');

new Server({
	port: 3000,
	exchanges: [
		/*new Kraken({
			key: config.exchanges.kraken.key,
			secret: config.exchanges.kraken.secret
		}),*/
		new Bitmex()
	]
});