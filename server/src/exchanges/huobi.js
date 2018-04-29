const Exchange = require('../exchange');
const WebSocket = require('ws');
const pako = require('pako');

class Huobi extends Exchange {

	constructor(options) {
		super(options);

    this.id = 'huobi';

    this.pairs = [
      'NASETH',
      'EOSETH',
      'ZECUSDT',
      'EVXBTC',
      'MDSETH',
      'SMTETH',
      'TRXETH',
      'THETAUSDT',
      'LUNETH',
      'SMTUSDT',
      'BCHBTC',
      'LETUSDT',
      'GNXETH',
      'MTLBTC',
      'CHATETH',
      'QTUMUSDT',
      'SNTBTC',
      'WPRBTC',
      'ELFETH',
      'ZILBTC',
      'UTKBTC',
      'SBTCBTC',
      'TNTBTC',
      'NEOUSDT',
      'MCOBTC',
      'OSTETH',
      'BT2BTC',
      'HSRETH',
      'TOPCETH',
      'SALTETH',
      'AIDOCETH',
      'WAXBTC',
      'DTAETH',
      'BTCUSDT',
      'GASETH',
      'NEOBTC',
      'BTMBTC',
      'BLZETH',
      'BATETH',
      'APPCBTC',
      'CMTBTC',
      'ONTBTC',
      'QTUMETH',
      'IOSTBTC',
      'REQBTC',
      'BTMETH',
      'RUFFBTC',
      'ZECBTC',
      'DGDETH',
      'DATETH',
      'STKETH',
      'HTETH',
      'QUNETH',
      'ELFBTC',
      'CMTETH',
      'CTXCETH',
      'SNTUSDT',
      'MDSUSDT',
      'STORJUSDT',
      'WAXETH',
      'POWRBTC',
      'SNCBTC',
      'VENUSDT',
      'TNBETH',
      'SWFTCETH',
      'EOSBTC',
      'LINKETH',
      'HTUSDT',
      'RDNBTC',
      'LUNBTC',
      'GNXBTC',
      'ELABTC',
      'LETETH',
      'IOSTUSDT',
      'EVXETH',
      'ACTETH',
      'BCHUSDT',
      'ICXETH',
      'BCXBTC',
      'MTNETH',
      'PROPYETH',
      'XRPUSDT',
      'ICXBTC',
      'THETAETH',
      'SNCETH',
      'DBCETH',
      'ITCUSDT',
      'SMTBTC',
      'SRNETH',
      'ETHUSDT',
      'ITCBTC',
      'OMGBTC',
      'STKBTC',
      'MDSBTC',
      'TOPCBTC',
      'ADXBTC',
      'ETCBTC',
      'KNCBTC',
      'CVCBTC',
      'QSPETH',
      'BTGBTC',
      'EDUBTC',
      'ZLAETH',
      'MTXETH',
      'EOSUSDT',
      'RCNBTC',
      'UTKETH',
      'RCNETH',
      'GNTUSDT',
      'APPCETH',
      'WICCBTC',
      'YEEBTC',
      'YEEETH',
      'OMGUSDT',
      'LINKBTC',
      'XEMUSDT',
      'HSRUSDT',
      'DASHBTC',
      'QUNBTC',
      'QASHETH',
      'DTABTC',
      'AIDOCBTC',
      'DATBTC',
      'RUFFETH',
      'SALTBTC',
      'ELAETH',
      'IOSTETH',
      'THETABTC',
      'LETBTC',
      'DTAUSDT',
      'SOCETH',
      'ELAUSDT',
      'ZILUSDT',
      'MANABTC',
      'XRPBTC',
      'ONTETH',
      'LTCUSDT',
      'DBCBTC',
      'BCDBTC',
      'SWFTCBTC',
      'CVCUSDT',
      'CTXCBTC',
      'NASUSDT',
      'GNTETH',
      'TRXUSDT',
      'HTBTC',
      'ENGETH',
      'PAYETH',
      'CVCETH',
      'TNBBTC',
      'MEEETH',
      'POWRETH',
      'BLZBTC',
      'PAYBTC',
      'ADXETH',
      'EKOETH',
      'SRNBTC',
      'OCNETH',
      'VENETH',
      'ABTETH',
      'BIFIBTC',
      'ACTBTC',
      'ETCUSDT',
      'OSTBTC',
      'MCOETH',
      'ABTBTC',
      'STORJBTC',
      'VENBTC',
      'GNTBTC',
      'LSKBTC',
      'EKOBTC',
      'LTCBTC',
      'OCNBTC',
      'RUFFUSDT',
      'WPRETH',
      'ASTBTC',
      'DASHUSDT',
      'DGDBTC',
      'ZILETH',
      'ZRXBTC',
      'ETHBTC',
      'REQETH',
      'TRXBTC',
      'WICCETH',
      'NASBTC',
      'MEEBTC',
      'ENGBTC',
      'LSKETH',
      'RPXBTC',
      'TNTETH',
      'MTXBTC',
      'SOCBTC',
      'EDUETH',
      'HSRBTC',
      'QTUMBTC',
      'QSPBTC',
      'BATBTC',
      'QASHBTC',
      'ITCETH',
      'XEMBTC',
      'MANAETH',
      'GASBTC',
      'MTNBTC',
      'CHATBTC',
      'BT1BTC',
      'ZLABTC',
      'OMGETH',
      'PROPYBTC',
      'RDNETH',
      'ELFUSDT'
    ];

    this.mapping = pair => {
      pair = pair.replace(/USD$/, 'USDT');

      if (this.pairs.indexOf(pair) !== -1) {
        return pair.toLowerCase();
      }

      return false;
    }

		this.options = Object.assign({
			url: 'wss://api.huobi.pro/ws',
		}, this.options);
	}

	connect(pair) {
    if (!super.connect(pair))  
      return;

    this.api = new WebSocket(this.getUrl());

		this.api.on('message', event => this.emitData(this.format(event)));

		this.api.on('open', event => {
      this.api.send(JSON.stringify({
        sub: 'market.' + this.pair + '.trade.detail',
        id: this.pair,
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
    const json = JSON.parse(pako.inflate(event, {to: 'string'}));

    if (!json) {
      return;
    }

    if (json.ping) {
      this.api.send(JSON.stringify({pong: json.ping}));
      return;
    } else if (json.tick && json.tick.data && json.tick.data.length) {
      return json.tick.data.map(trade => [
        trade.ts,
        +trade.price,
        +trade.amount,
        trade.direction === 'buy' ? 1 : 0
      ]);
    }
	}

}

module.exports = Huobi;