const Exchange = require('../Exchange');
const WebSocket = require('ws');
const pako = require('pako');

class Huobi extends Exchange {

	constructor(options) {
		super(options);

    this.id = 'huobi';

    this.mapping = {
      BTCUSD: 'btcusdt'
    }

		this.options = Object.assign({
			url: 'wss://api.huobi.pro/ws',
		}, this.options);
	}

	connect() {
		console.log('[huobi] connecting');

    this.server = new WebSocket(this.getUrl());

		this.server.on('message', event => this.emitData(this.format(event)));

		this.server.on('open', event => {
      this.server.send(JSON.stringify({
        sub: 'market.btcusdt.trade.detail',
        id: 'btcusdt',
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
    const json = JSON.parse(pako.inflate(event, {to: 'string'}));

    if (!json) {
      return;
    }

    if (json.ping) {
      this.server.send(JSON.stringify({pong: json.ping}));
      return;
    }

    if (json.tick && json.tick.data && json.tick.data.length) {
      return json.tick.data.map(trade => [
        trade.id,
        trade.ts,
        +trade.price,
        +trade.amount,
        trade.direction === 'buy' ? 1 : 0
      ]);
    }
	}

}

module.exports = Huobi;