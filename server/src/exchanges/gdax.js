const Exchange = require('../Exchange');
const WebSocket = require('ws');

class Gdax extends Exchange {

	constructor(options) {
		super(options);

    this.id = 'gdax';
    this.orderbook = {};

		this.options = Object.assign({
			url: 'wss://ws-feed.gdax.com',
		}, this.options);
	}

	connect() {
		console.log('[gdax] connecting');

		this.server = new WebSocket(this.getUrl());
		this.server.on('message', data => {
      if (!data) {
        return;
      }

      let obj = JSON.parse(data);

      let trade = this.orderbook[obj.order_id];

      switch (obj.type) {
        case 'received':
          obj.sizes = [];
          obj.prices = [];

          this.orderbook[obj.order_id] = obj;
          break;

        case 'match':
          trade = this.orderbook[obj.taker_order_id];

          if (!trade) {
            return;
          }

          if (!trade.prices) {
            trade.prices = [];
          }

          if (!trade.sizes) {
            trade.sizes = [];
          }

          trade.sizes.push(+obj.size);
          trade.prices.push(+obj.price);

          this.orderbook[obj.order_id] = trade;
        break;

        case 'done':
          if (!trade || !trade.sizes.length) {
            if (obj.reason === 'filled') {
              if (!trade) {
                console.log("[gdax] received filled order without trade");
              } else {
                console.log("[gdax] received filled order without sizes");
              }
            }
            return;
          }

          if (!+obj.remaining_size || obj.reason === 'canceled') {
            delete this.orderbook[obj.order_id];
          }

          trade.size = +trade.sizes.reduce((a, b) => a + b).toFixed(8);
          trade.price = (trade.prices.map((price, index) => price * trade.sizes[index]).reduce((a, b) => a + b) / trade.prices.length) / (trade.sizes.reduce((a, b) => a + b) / trade.sizes.length);

          if (obj.reason === 'filled') {
            this.emitData([[
              this.id + trade.order_id,
              +new Date(obj.time),
              trade.price,
              +trade.size,
              trade.side === 'buy' ? 1 : 0,
              trade.order_type === 'limit' ? 1 : 0,
            ]]);
          }
      }
    });

		this.server.on('open', event => {
      this.server.send(JSON.stringify({
        type: 'subscribe',
        channels: [{"name": "full", "product_ids": ["BTC-USD"]}]
      }));

      this.emitOpen.bind(this)
    });

		this.server.on('close', this.emitClose.bind(this));

    this.server.on('error', this.emitError.bind(this));

    setInterval(() => {
      console.log('[gdax] orderbook length', Object.keys(this.orderbook).length);
    }, 60000)
	}

	disconnect() {
    if (this.server && this.server.readyState < 2) {
      this.server.close();
    }
	}

}

module.exports = Gdax;