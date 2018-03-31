const Exchange = require('../Exchange');
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

		this.server = new WebSocket(this.getUrl());
		this.server.on('message', data => {
      if (!data) {
        return;
      }

      let obj = JSON.parse(data);

      if (obj && obj.type === 'match') {
        this.emitData([[
          this.id + obj.maker_order_id.substr(-12) + obj.taker_order_id.substr(-12),
          +new Date(obj.time),
          +obj.price,
          +obj.size,
          obj.side === 'buy' ? 0 : 1,
        ]]);
      }
    });

		this.server.on('open', event => {
      this.server.send(JSON.stringify({
        type: 'subscribe',
        channels: [{"name": "full", "product_ids": [this.pair]}]
      }));

      this.emitOpen(event);
    });

		this.server.on('close', this.emitClose.bind(this));
    this.server.on('error', this.emitError.bind(this));
	}

	disconnect() {
    if (!super.disconnect())
      return;

    if (this.server && this.server.readyState < 2) {
      this.server.close();
    }
	}

}

module.exports = Gdax;