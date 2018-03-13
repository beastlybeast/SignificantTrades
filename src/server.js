const WebSocket = require('ws');

class Server {

	constructor(configuration, exchanges) {
		this.configuration = Object.assign({
			port: 8080,
		}, configuration);

		this.exchanges = [];

		this.listen();
	}

	listen() {
		this.wss = new WebSocket.Server({
			port: this.configuration.port
		});

		this.wss.on('listening', (ws, req) =>  {
			console.log('server listening on port ' + this.configuration.port);
		});

		this.exchanges.forEach(exchange => {
			exchange.on('data', this.broadcast);
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