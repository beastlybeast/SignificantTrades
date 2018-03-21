const EventEmitter = require('events');
const WebSocket = require('ws');

class Exchange extends EventEmitter {

	constructor(options) {
		super();

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

		const groupById = {};

		for (let trade of data) {
			if (!groupById[trade[0]]) {
				groupById[trade[0]] = trade;
				continue;
			}

			groupById[trade[0]][3] += trade[3];
			continue;
		}

		this.emit('data', {
			exchange: this.id,
			data: Object.keys(groupById).map(id => groupById[id])
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