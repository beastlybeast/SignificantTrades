const Exchange = require('../exchange');
const WebSocket = require('ws');
class Gdax extends Exchange {

	constructor(options) {
		super(options);

    this.id = 'gdax';

    this.pairs = [
      'BCH-BTC',
      'BCH-USD',
      'BTC-EUR',
      'BTC-GBP',
      'BTC-USD',
      'ETH-BTC',
      'ETH-EUR',
      'ETH-USD',
      'LTC-BTC',
      'LTC-EUR',
      'LTC-USD',
      'BCH-EUR'
    ]

    this.mapping = pair => {
      pair = pair.substr(0, 3) + '-' + pair.substr(3, pair.length);

      if (this.pairs.indexOf(pair) !== -1) {
        return pair;
      }

      return false;
    }

		this.options = Object.assign({
			url: 'wss://ws-feed.gdax.com',
		}, this.options);
	}

	connect(pair) {
    if (!super.connect(pair))  
      return;

		this.api = new WebSocket(this.getUrl());
		this.api.on('message', data => {
      if (!data) {
        return;
      }

      let obj = JSON.parse(data);

      if (obj && obj.type === 'match') {
        this.emitData([[
          +new Date(obj.time),
          +obj.price,
          +obj.size,
          obj.side === 'buy' ? 0 : 1,
        ]]);
      }
    });

		this.api.on('open', event => {
      this.api.send(JSON.stringify({
        type: 'subscribe',
        channels: [{"name": "full", "product_ids": [this.pair]}]
      }));

      this.emitOpen(event);
    });

		this.api.on('close', this.emitClose.bind(this));
    this.api.on('error', this.emitError.bind(this));
	}

	disconnect() {
    if (!super.disconnect())
      return;

    if (this.api && this.api.readyState < 2) {
      this.api.close();
    }
	}

}

module.exports = Gdax;