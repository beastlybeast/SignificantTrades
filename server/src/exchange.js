const EventEmitter = require('events');
const WebSocket = require('ws');

class Exchange extends EventEmitter {

	constructor(options) {
		super();

		this.timestamps = {};

		this.options = Object.assign({
			// default exchanges options
		}, options || {});
	}

	emitOpen(event) {
		console.log(`[${this.id}] connected`);

		this.emit('open', event);
	}

	emitData(data) {
		if (!data || !data.length) {
			return;
		}

		this.timestamps[this.id] =

		// console.log(`[${this.id}] emit ->`, data);
		this.emit('data', {
			exchange: this.id,
			data: data
		});
	}

	emitError(error) {
		console.log(`[${this.id}] error`, error.message);
	}

	emitClose(event) {
		console.log(`[${this.id}] closed`);
	}

	getUrl() {
		return typeof this.options.url === 'function' ? this.options.url.apply(this, arguments) : this.options.url;
	}

	format(data) {
		return data;
	}

}

module.exports = Exchange;