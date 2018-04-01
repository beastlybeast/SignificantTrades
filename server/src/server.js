const WebSocket = require('ws');
const url = require('url');

class Server {

	constructor(options) {
		this.timestamps = {};
		this.connected = false;
		this.processingAction = false;

		this.options = Object.assign({
			pair: 'BTCUSD',
			port: 8080,
			delay: false,
			exchange: []
		}, options);

		if (!this.options.exchanges || !this.options.exchanges.length) {
			throw new Error('You need to specify at least one exchange to track');
		}

		this.exchanges = this.options.exchanges;

		this.queue = [];

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
			const ip = req.connection.remoteAddress;
			console.log('[client] ' + ip + ' joined ' + req.url);

			ws.send(JSON.stringify({
				type: 'welcome',
				pair: this.options.pair,
				exchanges: this.exchanges.map((exchange) => {
					return {
						id: exchange.id,
						connected: exchange.connected
					}
				})
			}));

			ws.on('message', event => {
				if (this.processing) {
					console.log(`[${ip}] message blocked due to current action`, event);
				}

				let method, message;

				try {
					const json = JSON.parse(event);

					method = json.method;
					message = json.message;
				} catch (error) {
					console.log(`[${ip}]`, 'invalid message', event);
					return;
				}

				switch (method) {
					case 'pair':
						this.options.pair = message.toUpperCase();

						console.log(`[${ip}] switching pair`, this.options.pair);

						this.action(method, next => {
							this.disconnect();

							this.broadcast({
								type: 'pair',
								pair: this.options.pair,
							})

							setTimeout(() => {
								this.connect();

								next();
							}, 5000);
						})
					break;
					default:
						console.log(`[${ip}] unrecognized method`, method);
					break;
				}
			})
		});

		this.exchanges.forEach(exchange => {
			exchange.on('data', event => {
				this.timestamps[event.exchange] = +new Date();

				for (let trade of event.data) {
					trade.unshift(event.exchange);

					if (this.options.delay) {
						this.queue.unshift(trade);
					}
				}

				if (!this.options.delay) {
					this.broadcast(event.data);
				}
			});

			exchange.on('open', event => {
				if (!this.connected) {
					console.log(`[warning] "${exchange.id}" connected but the server state was disconnected`);
					return exchange.disconnect();
				}

				this.broadcast({
					type: 'exchange_connected',
					id: exchange.id
				});
			});

			exchange.on('err', event => {
				this.broadcast({
					type: 'exchange_error',
					id: exchange.id,
					message: event.message
				});
			});

			exchange.on('close', event => {
				if (this.connected) {
					exchange.reconnect(this.options.pair);
				}

				this.broadcast({
					type: 'exchange_disconnected',
					id: exchange.id
				});
			});
		});

		this.profilerInterval = setInterval(this.profiler.bind(this), 60000);
	}

	connect() {
		console.log('[server] connect exchange using pair', this.options.pair);

		this.connected = true;

		this.exchanges.forEach(exchange => {
			exchange.connect(this.options.pair);
		});

		if (this.options.delay) {
			this.delayInterval = setInterval(() => {
				if (!this.queue.length) {
					return;
				}

				this.broadcast(this.queue);

				this.queue = [];
			}, this.options.delay || 1000);
		}
	}

	broadcast(data) {
		this.wss.clients.forEach(client => {
			if (client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(data));
			}
		});
	}

	disconnect() {
		clearInterval(this.delayInterval);

		this.connected = false;

		this.exchanges.forEach(exchange => {
			exchange.disconnect();
		});
	}

	action(method, fn) {
		if (this.processingAction) {
			return console.error('[warning] wait until current action is done');
		}

		console.log(`[${method}] starting`);
		
		this.processingAction = true;

		fn(() => {
			console.log(`[${method}] done`);
			this.processingAction = false;
		});
	}

	profiler() {
		const now = +new Date();

		this.exchanges.forEach(exchange => {
			if (!exchange.connected) {
				return;
			}

			if (!this.timestamps[exchange.id]) {
				console.log('[warning] no data sent from ' + exchange.id);
				return;
			}

			if (now - this.timestamps[exchange.id] > 1000 * 60 * 5) {
				console.log('[warning] ' + exchange.id + ' hasn\'t sent any data since more than 5 minutes');
				exchange.reconnect();
				
				delete this.timestamps[exchange.id];
				return;
			}
		})
	}

}

module.exports = Server;