const WebSocket = require('ws');
const url = require('url');
const fs = require('fs');
const http = require('http');

class Server {

	constructor(options) {
		this.timestamps = {};
		this.connected = false;
		this.processingAction = false;
		this.chunk = [];

		this.options = Object.assign({
			pair: 'BTCUSD',
			port: 8080,
			delay: false,
			profilerInterval: 60000,
			backupInterval: 60000 * 10,
		}, options);

		if (!this.options.exchanges || !this.options.exchanges.length) {
			throw new Error('You need to specify at least one exchange to track');
		}

		this.exchanges = this.options.exchanges;

		this.queue = [];

		this.listen();
		this.connect();

		process.on('SIGINT', this.backup.bind(this, [true]));
	}

	listen() {
		this.wss = new WebSocket.Server({
			noServer: true
		});

		this.wss.on('connection', (ws, req) =>  {
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

					this.chunk.push(trade);

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

		this.profilerInterval = setInterval(this.profiler.bind(this), this.options.profilerInterval);
		this.backupInterval = setInterval(this.backup.bind(this), this.options.backupInterval);		
		
		this.http = http.createServer((request, response) => {
			const path = url.parse(request.url).path;

			const routes = [{
				match: /^\/?history\/(\d+)\/?$/, 
				response: (timeframe) => {
					const now = +new Date();
					const from = now - timeframe * 60 * 1000;
					let date, name, path, chunk, output = [];

					for (let i = from; i < now; i += 60 * 1000 * 60 * 24) {
						date = new Date(i);
						name = this.options.pair + '_' + ('0' + date.getDate()).slice(-2) + '-' + ('0' + (date.getMonth()+1)).slice(-2) + '-' + date.getFullYear();
						path = 'data/' + name + '.json';

						try {
							chunk = JSON.parse(fs.readFileSync(path, 'utf8'));
							
							if (i === from) {
								console.log(`[server/history] unpacking ${path} (ms ${i})`, chunk.length);

								for (let j = 0; j < chunk.length; j++) {
									if (chunk[j][2] < i) {
										continue;
									}

									output.push(chunk[j]);
								}
							} else {
								console.log(`[server/history] append ${path} (ms ${i}) to output`, chunk.length);

								output = output.concat(chunk);
							}
						} catch (error) {
							console.log(`[server/history] unable to get ${path} (ms ${i})`, error);
						}
					}

					for (let i = this.chunk.length - 1; i >= 0; i--) {
						if (this.chunk[i][2] < from) {
							break;
						}

						output.push(this.chunk[i]);
					}

					response.setHeader('Access-Control-Allow-Origin', '*');
					response.setHeader('Content-Type', 'application/json');
					response.end(JSON.stringify(output));
				}
			}];

			for (let route of routes) {
				if (route.match.test(path)) {
					route.response.apply(this, path.match(route.match).splice(1));
					break;
				}
			}

			if (!response.finished) {
				response.writeHead(404);
				response.end('<a href="https://github.com/Tucsky/SignificantTrades">SignificantTrades</p>');
			}
		});

		this.http.on('upgrade', (request, socket, head) => {
			console.log('on upgrade', request.url);
			this.wss.handleUpgrade(request, socket, head, ws => {
				this.wss.emit('connection', ws, request);
			});
		});
		
		this.http.listen(this.options.port, () => {
			console.log('http server listening on port ' + this.options.port);
		});
	}

	connect() {
		console.log('[server] connect exchange using pair', this.options.pair);

		this.connected = true;
		this.chunk = [];

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

	backup(exit = false) {
		const duration = this.options.backupInterval / 1000 + 's';

		const date = new Date();
		const name = this.options.pair + '_' + ('0' + date.getDate()).slice(-2) + '-' + ('0' + (date.getMonth()+1)).slice(-2) + '-' + date.getFullYear();
		const path = 'data/' + name + '.json';
		
		fs.readFile(path, (err, data) => {
			if (err) {
				if (err.code === 'ENOENT') {
					fs.writeFile(path, JSON.stringify(this.chunk), (err, data) => {
						if (err) {
							throw new Error(err);
						}

						console.log(`[server] backup ${duration} of data into new file "${path}" (${this.chunk.length} trades)`);

						this.chunk.splice(0, this.chunk.length);

						exit && process.exit();
					});

					return;
				}

				throw new Error(err);
			}

			let json = JSON.parse(data);

			json = json.concat(this.chunk);

			fs.writeFile(path, JSON.stringify(json), (err, data) => {
				if (err) {
					throw new Error(err);
				}

				console.log(`[server] backup ${duration} of data into "${path}" (${json.length - this.chunk.length} + ${this.chunk.length} trades)`);

				this.chunk.splice(0, this.chunk.length);

				exit && process.exit();
			});
		});
	}

}

module.exports = Server;