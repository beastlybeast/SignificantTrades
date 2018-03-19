const Exchange = require('../Exchange');
const WebSocket = require('ws');

class Binance extends Exchange {

	constructor(options) {
		super(options);

    this.id = 'binance';

    this.mapping = {
      BTCUSD: 'btcusdt'
    }

		this.options = Object.assign({
			url: (pair) => {
        return 'wss://stream.binance.com:9443/ws/' + pair + '@trade';
      },
		}, this.options);
	}

	connect(pair) {
    if (!this.mapping[pair]) {
      return;
    }

		console.log('[binance] connecting');

    this.server = new WebSocket(this.getUrl(this.mapping[pair]));

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
		const trade = JSON.parse(event);

    if (trade && trade.t) {
      return [[
        this.id + trade.t,
        trade.E,
        +trade.p,
        +trade.q,
        trade.m ? 1 : 0
      ]]
    } else {
      console.error('[binance] unrecognized expression', event);
    }

		return false;
	}

}

module.exports = Binance;