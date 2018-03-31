const Exchange = require('../Exchange');
const Pusher = require('pusher-js');

class Bitstamp extends Exchange {

	constructor(options) {
		super(options);

		this.id = 'bitstamp';

    this.pairs = [
      'LTCUSD',
      'ETHUSD',
      'XRPEUR',
      'BCHUSD',
      'BCHEUR',
      'BTCEUR',
      'XRPBTC',
      'EURUSD',
      'BCHBTC',
      'LTCEUR',
      'BTCUSD',
      'LTCBTC',
      'XRPUSD',
      'ETHBTC',
      'ETHEUR'
    ];

		this.mapping = pair => {
      if (this.pairs.indexOf(pair) !== -1) {
        return pair.toLowerCase();
      }

      return false;
    }

		this.options = Object.assign({
			appId: 'de504dc5763aeef9ff52',
			channel: 'live_trades',
			bind: 'trade',
		}, this.options);
	}

	connect(pair) {
    if (!super.connect(pair))  
      return;

    this.server = new Pusher(this.options.appId);
    const channel = this.server.subscribe(this.options.channel + (this.pair === 'btcusd' ? '' : '_' + this.pair));

    this.server.bind(this.options.bind, trade => this.emitData(this.format(trade)));

    this.server.connection.bind('error', this.emitError.bind(this));
    this.server.connection.bind('connected', this.emitOpen.bind(this));
    this.server.connection.bind('disconnected', this.emitClose.bind(this));
	}

	disconnect() {
    if (!super.disconnect())  
      return;
      
    if (this.server && this.server.connection.state === 'connected') {
      this.server.disconnect();
    }
	}

	format(trade) {
    return [[
      this.id + trade.id,
      +new Date(trade.timestamp * 1000),
      trade.price,
      trade.amount,
      trade.type === 0 ? 1 : 0,
    ]];
	}

}

module.exports = Bitstamp;