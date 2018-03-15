const EventEmitter = require('events');
const WebSocket = require('ws');

class Exchange extends EventEmitter {

	constructor(options) {
		super();

		if (options && typeof options === 'string') {
			this.options = {
				url: options
			}
		} else {
			this.options = Object.assign({
			}, options);
		}
	}

	emitOpen(event) {
		console.log(`[${this.id}] connected`);

		this.emit('open', event);
	}

	emitData(data) {
		if (!data || !data.length) {
			return;
		}

		console.log(`[${this.id}] emit ->`, data);
		this.emit('data', {
			id: this.id,
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
		return typeof this.options.url === 'function' ? this.options.url.apply(this) : this.options.url;
	}

	format(data) {
		return data;
	}

}

module.exports = Exchange;