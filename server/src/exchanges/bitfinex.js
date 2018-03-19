const Exchange = require('../Exchange');
const WebSocket = require('ws');

class Bitfinex extends Exchange {

	constructor(options) {
		super(options);

    this.id = 'bitfinex';

		this.options = Object.assign({
			url: 'wss://api.bitfinex.com/ws/2',
		}, this.options);
	}

	connect() {
		console.log('[bitfinex] connecting');

    this.server = new WebSocket(this.getUrl());

		this.server.on('message', event => this.emitData(this.format(event)));

		this.server.on('open', event => {
      this.server.send(JSON.stringify({
        event: 'subscribe',
        channel: 'trades',
        symbol: 'tBTCUSD',
      }));
    });

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

    if (!json || json[1] !== 'te') {
      return;
    }

    return [[
      this.id + json[2][0],
      +new Date(json[2][1]),
      +json[2][3],
      Math.abs(json[2][2]),
      json[2][2] < 0 ? 0 : 1
    ]];
	}

}

module.exports = Bitfinex;