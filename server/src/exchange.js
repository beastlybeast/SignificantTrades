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

		this.reconnectionDelay = 5000;

		this.emit('open', event);
	}

	emitData(data) {
		if (!data || !data.length) {
			return;
		}

		const group = {};
		const now = +new Date();

		for (let trade of data) {
			const id = trade[0] + '_' + trade[3];

			if (group[id] && !group[id][4]) {
				group[id][1].push(trade[1]);
				group[id][2].push(trade[2]);
			} else {
				trade[0] = Math.min(now + 1000, trade[0]);
				trade[1] = [trade[1]];
				trade[2] = [trade[2]];
				group[id] = trade;
			}
		}

		this.emit('data', {
			exchange: this.id,
			data: Object.keys(group).map(id => {
				const stacked = group[id][2].map(a => a);

				group[id][1] = (group[id][1].map((price, index) => price * group[id][2][index]).reduce((a, b) => a + b) / group[id][1].length) / (group[id][2].reduce((a, b) => a + b) / group[id][2].length);
				group[id][2] = group[id][2].reduce((a, b) => a + b);

				const firstDigitIndex = group[id][2].toFixed(8).match(/[1-9]/);

				group[id][1] = this.toFixed(group[id][1], 10);
				group[id][2] = this.toFixed(group[id][2], 10);

				return group[id];
			})
		});
	}

	toFixed(number, precision) {
		var factor = Math.pow(10, precision);
		return Math.ceil(number * factor) / factor;
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