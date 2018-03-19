const Exchange = require('../Exchange');
const WebSocket = require('ws');

class Bitmex extends Exchange {

	constructor(options) {
		super(options);

		this.id = 'bitmex';

		this.options = Object.assign({
			url: 'wss://www.bitmex.com/realtime?subscribe=trade:XBTUSD',
		}, this.options);
	}

	connect() {
		console.log('[bitmex] connecting');

		this.server = new WebSocket(this.getUrl());
		this.server.on('message', event => this.emitData(this.format(event)));

		this.server.on('open', this.emitOpen.bind(this));

		this.server.on('close', this.emitClose.bind(this));

		this.server.on('error', this.emitError.bind(this));
	}

	disconnect() {
		if (this.server && this.server.readyState < 2) {
			this.server.close();
		}
	}

	format(event) {
		const json = JSON.parse(event);

		if (json && json.data && json.data.length) {
			return json.data.map(trade => {
				return [
					this.id + trade.trdMatchID,
					+new Date(trade.timestamp),
					trade.price,
					trade.size,
					trade.side === 'Buy',
					trade.tickDirection.indexOf('Zero') === 0
				];
			})
		}

		return false;
	}

}

module.exports = Bitmex;