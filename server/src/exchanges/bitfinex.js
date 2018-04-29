const Exchange = require('../exchange');
const WebSocket = require('ws');

class Bitfinex extends Exchange {

	constructor(options) {
		super(options);

    this.id = 'bitfinex';

    this.pairs = [
      'BTCEUR',
      'BTCJPY',
      'BTCGBP',
      'BTCUSD',
      'ETHEUR',
      'ETHJPY',
      'ETHGBP',
      'ETHUSD',
      'ETHBTC',
      'EOSEUR',
      'EOSJPY',
      'EOSGBP',
      'EOSUSD',
      'EOSBTC',
      'EOSETH',
      'LTCUSD',
      'LTCBTC',
      'XRPUSD',
      'XRPBTC',
      'ETCUSD',
      'ETCBTC',
      'NEOEUR',
      'NEOJPY',
      'NEOGBP',
      'IOTAEUR',
      'IOTAJPY',
      'IOTAGBP',
      'IOTAUSD',
      'IOTABTC',
      'IOTAETH',
      'XMRUSD',
      'XMRBTC',
      'TRXUSD',
      'TRXBTC',
      'TRXETH',
      'DASHUSD',
      'DASHBTC',
      'ZECUSD',
      'ZECBTC',
      'SANUSD',
      'SANBTC',
      'SANETH',
      'ZRXUSD',
      'ZRXBTC',
      'ZRXETH',
      'BATUSD',
      'BATBTC',
      'BATETH',
      'SNTETH',
      'RCNUSD',
      'RCNBTC',
      'RCNETH',
      'TNBUSD',
      'TNBBTC',
      'TNBETH',
      'REPUSD',
      'REPBTC',
      'REPETH',
      'ELFUSD',
      'ELFBTC',
      'ELFETH',
      'FUNUSD',
      'FUNBTC',
      'FUNETH',
      'SPKUSD',
      'SPKBTC',
      'SPKETH',
      'AIDUSD',
      'AIDBTC',
      'AIDETH',
      'MNAUSD',
      'MNABTC',
      'MNAETH',
      'SNGUSD',
      'SNGBTC',
      'SNGETH',
      'RLCUSD',
      'RLCBTC',
      'RLCETH',
      'RRTUSD',
      'RRTBTC'
    ];

    this.mapping = pair => {
      if (this.pairs.indexOf(pair) !== -1) {
        return pair;
      } 

      return false;
    }

		this.options = Object.assign({
			url: 'wss://api.bitfinex.com/ws/2',
		}, this.options);
	}

	connect(pair) {
    if (!super.connect(pair))  
      return;

    this.api = new WebSocket(this.getUrl());

		this.api.on('message', event => this.emitData(this.format(event)));

		this.api.on('open', event => {
      this.api.send(JSON.stringify({
        event: 'subscribe',
        channel: 'trades',
        symbol: 't' + this.pair,
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

	format(event) {
		const json = JSON.parse(event);

    if (!json || json[1] !== 'te') {
      return;
    }

    return [[
      +new Date(json[2][1]),
      +json[2][3],
      Math.abs(json[2][2]),
      json[2][2] < 0 ? 0 : 1
    ]];
	}

}

module.exports = Bitfinex;