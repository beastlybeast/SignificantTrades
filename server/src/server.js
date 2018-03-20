const WebSocket = require('ws');
const url = require('url');
const config = require('../config');

class Server {

	constructor(options) {
		this.timestamps = {};

		this.options = Object.assign({
			pair: 'BTCUSD',
			port: 8080,
			exchange: []
		}, options);

		if (!this.options.exchanges || !this.options.exchanges.length) {
			throw new Error('You need to specify at least one exchange to track');
		}

		this.exchanges = this.options.exchanges;

		this.listen();
		this.connect();

		// setTimeout(this.disconnect.bind(this), 10000);
	}

	listen() {
		this.wss = new WebSocket.Server({
			port: this.options.port
		});

		this.wss.on('listening', (ws, req) =>  {
			console.log('server listening on port ' + this.options.port);
		});

		this.wss.on('connection', (ws, req) =>  {
			const location = url.parse(req.url, true);
			console.log('client ' + req.connection.remoteAddress + ' from ' + req.url);
		});

		this.exchanges.forEach(exchange => {
			exchange.on('data', this.broadcast.bind(this));
		});

		this.profilerInterval = setInterval(this.profileExchanges.bind(this), 10000);
	}

	connect() {
		console.log('[server] connect exchange using pair', this.options.pair);

		this.exchanges.forEach(exchange => {
			exchange.connect(this.options.pair);
		});
	}

	broadcast(data) {
		this.timestamps[data.exchange] = +new Date();

		this.wss.clients.forEach(client => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(data));
			}
		});
	}

	disconnect() {
		this.exchanges.forEach(exchange => {
			exchange.disconnect();
		});
	}

	profileExchanges() {
		const now = +new Date();

		this.exchanges.forEach(exchange => {
			if (!this.timestamps[exchange.id]) {
				console.log('[warning] no data sent from ' + exchange.id);
				return;
			}
			if (now - this.timestamps[exchange.id] > 1000 * 60 * 5) {
				console.log('[warning] ' + exchange.id + ' hasn\'t sent any data since more than 5 minutes');
				return;
			}
		})
	}

}

module.exports = Server;