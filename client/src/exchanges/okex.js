import Exchange from '../services/exchange'

class Okex extends Exchange {

	constructor(options) {
		super(options);

    this.id = 'okex';

    this.products = 'https://www.okex.com/api/v1/tickers.do';
    this.recents = () => `https://www.okex.com/api/v1/trades.do?symbol=${this.pair}`;

		this.options = Object.assign({
      url: 'wss://real.okex.com:10441/websocket'
		}, this.options);
	}

	connect() {
    if (!super.connect())  
      return;

    this.api = new WebSocket(this.getUrl());

    this.api.onmessage = event => this.emitTrades(this.formatLiveTrades(JSON.parse(event.data)));

    this.api.onopen = event => {
      this.api.send(JSON.stringify({event:'addChannel', channel:'ok_sub_spot_' + this.mapping[pair] + '_deals'}));

      this.keepalive = setInterval(() => {
        this.api.send(JSON.stringify({event: 'ping'}));
      }, 30000);

      this.emitOpen(event);
    };

    this.api.onclose = event => {
      this.emitClose(event);

      clearInterval(this.keepalive);
    };

    this.api.onerror = this.emitError.bind(this);
	}

	disconnect() {
    if (!super.disconnect())  
      return;

    clearInterval(this.keepalive);

    if (this.api && this.api.readyState < 2) {
      this.api.close();

      delete this.reference;
    }
	}

	formatLiveTrades(json) {
    const initial = typeof this.reference === 'undefined';

    if (!json || !json[0] || json[0].channel === 'addChannel') {
      return;
    }

    const base = new Date();
    base.setTime(base.getTime() + ((8 + base.getTimezoneOffset() / 60)*60*60*1000));

    const output = json[0].data.map((trade, index, array) => {
      const timestamp = +new Date(`${base.getFullYear()}-${base.getMonth() + 1}-${base.getDate()} ${trade[3]}+08:00`);

      if (index === array.length - 1) {
        this.reference = timestamp;
      }

      return [
        this.id,
        timestamp,
        +trade[1],
        +trade[2],
        trade[4] === 'bid' ? 1 : 0
      ];
    })

    if (!initial) {
      return output;
    }
	}

  formatRecentsTrades(response) {
    if (response && response.length) {
      return response.map(trade => [
        this.id,
        trade.date_ms,
        trade.price,
        trade.amount,
        trade.type === 'buy' ? 1 : 0,
      ]);
    }
  }

  formatProducts(response) {
    let output = {};

    if (response && response.tickers && response.tickers.length) {
      response.tickers.forEach(product => {
        output[product.symbol.split('_').join('').replace(/usdt$/, 'USD').toUpperCase()] = product.symbol;
      });
    }

    return output;
  }

}

export default Okex;