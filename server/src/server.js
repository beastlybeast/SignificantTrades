const WebSocket = require('ws');
const url = require('url');

class Server {

	constructor(configuration) {
		this.configuration = Object.assign({
			port: 8080,
			exchange: []
		}, configuration);

		if (!this.configuration.exchanges || !this.configuration.exchanges.length) {
			throw new Error('You need to specify at least one exchange to track');
		}

		this.exchanges = this.configuration.exchanges;

		this.listen();
		this.connect();
	}

	listen() {
		this.wss = new WebSocket.Server({
			port: this.configuration.port
		});

		this.wss.on('listening', (ws, req) =>  {
			console.log('server listening on port ' + this.configuration.port);
		});

		this.wss.on('connection', (ws, req) =>  {
			const location = url.parse(req.url, true);
			console.log('client ' + req.connection.remoteAddress + ' from ' + req.url);
		});

		this.exchanges.forEach(exchange => {
			exchange.on('data', this.broadcast.bind(this));
		})
	}

	connect() {
		this.exchanges.forEach(exchange => {
			exchange.connect();
		});
	}

	broadcast(data) {
		this.wss.clients.forEach(client => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(data);
			}
		});
	}

	disconnect() {
		this.exchanges.forEach(exchange => {
			exchange.disconnect();
		});
	}

}

module.exports = Server;