const EventEmitter = require('events');
const WebSocket = require('ws');

class Exchange extends EventEmitter {

	constructor(options) {
		if (!options || typeof options !== 'object') {
			return Error('Exchange need options');
		}

		if (!options.url || ['string', 'function'].indexOf(typeof options.url) === -1) {
			return Error('Exchange need valid url or function');
		}

		this.options = Object.assign({
		}, options);

		if (!options.name) {
			this.name = options.url.split('//')[0].substr(0, 8);
		}
	}

	emitOpen(event) {
		console.log('[connected]', this.id);

		this.emit('open', event);
	}

	emitData(data) {
		this.emit('data', data);
	}

	onError(error) {
		this.emit('error', error);
	}

	onClose(event) {
		console.log('[disconnected]', this.id);
	}

	getUrl() {
		return typeof this.options.url === 'function' ? this.options.url.apply(this) : url;
	}

	format(data) {
		return data;
	}

}

module.exports = Exchange;