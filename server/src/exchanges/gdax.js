const Exchange = require('../Exchange');
const WebSocket = require('ws');

class Gdax extends Exchange {

	constructor(options) {
		super(options);

    this.id = 'gdax';
    this.orderbook = {};
    this.receiveds = {};

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

      switch (obj.type) {
        case 'received':
          //console.log(obj.order_id, 'wanna', obj.side, obj.size, 'BTC', 'for', obj.size * obj.price, '('+obj.order_type+')');
          this.receiveds[obj.order_id] = obj;
          break;

        case 'match':
          console.log(obj.maker_order_id, obj.side === 'buy' ? 'brought' : 'sold', obj.size, 'BTC', 'at', '$' + (+obj.price).toFixed(2), '(of '+obj.taker_order_id+')');

          if (!this.orderbook[obj.maker_order_id])
            this.orderbook[obj.maker_order_id] = 0;

          if (!this.orderbook[obj.taker_order_id])
            this.orderbook[obj.taker_order_id] = 0;

          this.orderbook[obj.maker_order_id] += +(obj.size);
          this.orderbook[obj.taker_order_id] += +(obj.size);
        break;

        case 'done':
          if (this.orderbook[obj.order_id]) {
            let price;

            if (this.receiveds[obj.order_id]) {
              price = +this.receiveds[obj.order_id].price;
            } else if (obj.price) {
              price = +obj.price;
            } else {
              console.log('cannot determine price action of order', obj.order_id);
            }

            console.log(obj.order_id, (this.reason === 'filled' ? 'exited' : 'canceled') + ' after', obj.side === 'buy' ? 'buying' : 'selling', this.orderbook[obj.order_id], 'BTC', 'at', isNaN(price) ? 'UNKNOWN' : '$' + price.toFixed(2))
          } else if (obj.reason === 'filled') {
            console.log(obj.order_id, 'exited without any recorded trades after', ((+new Date(obj.time)) - (+new Date(this.receiveds[obj.order_id].time)) / 1000) + 's');
          }
/*
          this.emitData([[
            this.id + trade.order_id,
            +new Date(obj.time),
            trade.price,
            +trade.size,
            trade.side === 'buy' ? 1 : 0,
            trade.order_type === 'limit' ? 1 : 0,
          ]]);*/
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