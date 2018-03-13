const Exchange = require('../Exchange');
const WebSocket = require('ws');

class Bitmex extends Exchange {

	constructor(options) {
		super(options);

		this.id = 'bitmex';
	}

	connect() {
		this.server = new WebSocket(this.getUrl());

		this.server.onmessage = (event) => this.emitMessage(this.format(event));
		this.server.onopen = (event) => {
			this.server.send(JSON.stringify({
				event: 'subscribe',
				channel: 'trades',
				symbol: 'tBTCUSD',
			}))

			this.emitOpen(event);
		};
		this.server.onclose = (event) => this.emitClose(event);
		this.server.onerror = (event) => this.emitError(event);
	}

	disconnect() {
		this.server.close();

		this.emitClose();
	}

	format(event) {
		return event;
	}

}

module.exports = Bitmex;