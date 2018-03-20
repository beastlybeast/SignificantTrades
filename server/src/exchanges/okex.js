const Exchange = require('../Exchange');
const WebSocket = require('ws');

class Okex extends Exchange {

	constructor(options) {
		super(options);

    this.id = 'okex';

    this.mapping = {
      BTCUSD: 'btc_usdt'
    }

		this.options = Object.assign({
      url: 'wss://real.okex.com:10441/websocket'
		}, this.options);
	}

	connect(pair) {
    if (this.mapping[pair]) {
      console.log('[okex] connecting');

      this.server = new WebSocket(this.getUrl());

      this.server.on('message', event => this.emitData(this.format(event)));

      this.server.on('open', event => {
        this.server.send(JSON.stringify({event:'addChannel', channel:'ok_sub_spot_' + this.mapping[pair] + '_deals'}));

        this.keepalive = setInterval(() => {
          this.server.send(JSON.stringify({event: 'ping'}));
        }, 30000);
      });

      this.server.on('close', this.emitClose.bind(this));

      this.server.on('error', this.emitError.bind(this));
    }
	}

	disconnect() {
    clearInterval(this.keepalive);

    if (this.server && this.server.readyState < 2) {
      this.server.close();

      delete this.reference;
    }
	}

	format(event) {
    const json = JSON.parse(event);
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
        this.id + trade[0],
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

}

module.exports = Okex;