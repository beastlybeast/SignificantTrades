const EventEmitter = require('events');
const WebSocket = require('ws');

class Exchange extends EventEmitter {

	constructor(options) {
		super();

		this.connected = false;
		this.reconnectionDelay = 5000;

		this.options = Object.assign({
			// default exchanges options
		}, options || {});
	}

	connect(pair, reconnection) {
		if (this.connected) {
			console.error(`[${this.id}] already connected`);
			return;
		}

		this.pair = null;
	
		if (this.mapping) {
			if (typeof this.mapping === 'function') {
				this.pair = this.mapping(pair);
			} else {
				this.pair = this.mapping[pair];
			}
			
			if (!this.pair) {
				console.log(`[${this.id}] unknown pair ${pair}`);

				this.emit('err', new Error(`Unknown pair ${pair}`));

				return false;
			}
		}

		console.log(`[${this.id}] ${reconnection ? 're' : ''}connecting... (${this.pair})`);

		return true;
	}

	disconnect() {
		clearTimeout(this.reconnectionTimeout);

		return true;
	}

	reconnect(pair) {
		clearTimeout(this.reconnectionTimeout);

		if (this.connected) {
			return;
		}

		console.log(`[${this.id}] schedule reconnection (${this.reconnectionDelay} ms)`);

		this.reconnectionTimeout = setTimeout(() => {
			if (!this.connected) {
				this.connect(pair, true);
			}
		}, this.reconnectionDelay);

		this.reconnectionDelay *= 2;
	}

	emitOpen(event) {
		console.log(`[${this.id}] connected`);

		this.connected = true;

		this.emit('open', event);
	}

	emitData(data) {
		if (!data || !data.length) {
			return;
		}

		const group = {};
		const now = +new Date();

		for (let trade of data) {
			const id = trade[1] + '_' + trade[4];

			if (group[id]) {
				group[id][2].push(trade[2]);
				group[id][3].push(trade[3]);
			} else {
				trade[1] = Math.min(now + 1000, trade[1]);
				trade[2] = [trade[2]];
				trade[3] = [trade[3]];
				group[id] = trade;
			}
		}

		this.emit('data', {
			exchange: this.id,
			data: Object.keys(group).map(id => {
				group[id][2] = (group[id][2].map((price, index) => price * group[id][3][index]).reduce((a, b) => a + b) / group[id][2].length) / (group[id][3].reduce((a, b) => a + b) / group[id][3].length);
				group[id][3] = group[id][3].reduce((a, b) => a + b);

				return group[id];
			})
		});
	}

	emitError(error) {
		console.error(`[${this.id}] error`, error.message);

		this.emit('err', error);
	}

	emitClose(event) {
		console.log(`[${this.id}] closed`);

		this.connected = false;

		this.emit('close', event);
	}

	getUrl() {
		return typeof this.options.url === 'function' ? this.options.url.apply(this, arguments) : this.options.url;
	}

	format(data) {
		return data;
	}

}

module.exports = Exchange;