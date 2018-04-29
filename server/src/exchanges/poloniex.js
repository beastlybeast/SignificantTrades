const Exchange = require('../exchange');
const WebSocket = require('ws');

class Poloniex extends Exchange {

	constructor(options) {
		super(options);

    this.id = 'poloniex';

    this.mapping = {
			BCNBTC: 'BTC_BCN',
			BELABTC: 'BTC_BELA',
			BLKBTC: 'BTC_BLK',
			BTCDBTC: 'BTC_BTCD',
			BTMBTC: 'BTC_BTM',
			BTSBTC: 'BTC_BTS',
			BURSTBTC: 'BTC_BURST',
			CLAMBTC: 'BTC_CLAM',
			DASHBTC: 'BTC_DASH',
			DGBBTC: 'BTC_DGB',
			DOGEBTC: 'BTC_DOGE',
			EMC2BTC: 'BTC_EMC2',
			FLDCBTC: 'BTC_FLDC',
			FLOBTC: 'BTC_FLO',
			GAMEBTC: 'BTC_GAME',
			GRCBTC: 'BTC_GRC',
			HUCBTC: 'BTC_HUC',
			LTCBTC: 'BTC_LTC',
			MAIDBTC: 'BTC_MAID',
			OMNIBTC: 'BTC_OMNI',
			NAVBTC: 'BTC_NAV',
			NEOSBTC: 'BTC_NEOS',
			NMCBTC: 'BTC_NMC',
			NXTBTC: 'BTC_NXT',
			PINKBTC: 'BTC_PINK',
			POTBTC: 'BTC_POT',
			PPCBTC: 'BTC_PPC',
			RICBTC: 'BTC_RIC',
			STRBTC: 'BTC_STR',
			SYSBTC: 'BTC_SYS',
			VIABTC: 'BTC_VIA',
			XVCBTC: 'BTC_XVC',
			VRCBTC: 'BTC_VRC',
			VTCBTC: 'BTC_VTC',
			XBCBTC: 'BTC_XBC',
			XCPBTC: 'BTC_XCP',
			XEMBTC: 'BTC_XEM',
			XMRBTC: 'BTC_XMR',
			XPMBTC: 'BTC_XPM',
			XRPBTC: 'BTC_XRP',
			BTCUSD: 'USDT_BTC',
			DASHUSD: 'USDT_DASH',
			LTCUSD: 'USDT_LTC',
			NXTUSD: 'USDT_NXT',
			STRUSD: 'USDT_STR',
			XMRUSD: 'USDT_XMR',
			XRPUSD: 'USDT_XRP',
			BCNXMR: 'XMR_BCN',
			BLKXMR: 'XMR_BLK',
			BTCDXMR: 'XMR_BTCD',
			DASHXMR: 'XMR_DASH',
			LTCXMR: 'XMR_LTC',
			MAIDXMR: 'XMR_MAID',
			NXTXMR: 'XMR_NXT',
			ETHBTC: 'BTC_ETH',
			ETHUSD: 'USDT_ETH',
			SCBTC: 'BTC_SC',
			BCYBTC: 'BTC_BCY',
			EXPBTC: 'BTC_EXP',
			FCTBTC: 'BTC_FCT',
			RADSBTC: 'BTC_RADS',
			AMPBTC: 'BTC_AMP',
			DCRBTC: 'BTC_DCR',
			LSKBTC: 'BTC_LSK',
			LSKETH: 'ETH_LSK',
			LBCBTC: 'BTC_LBC',
			STEEMBTC: 'BTC_STEEM',
			STEEMETH: 'ETH_STEEM',
			SBDBTC: 'BTC_SBD',
			ETCBTC: 'BTC_ETC',
			ETCETH: 'ETH_ETC',
			ETCUSD: 'USDT_ETC',
			REPBTC: 'BTC_REP',
			REPUSD: 'USDT_REP',
			REPETH: 'ETH_REP',
			ARDRBTC: 'BTC_ARDR',
			ZECBTC: 'BTC_ZEC',
			ZECETH: 'ETH_ZEC',
			ZECUSD: 'USDT_ZEC',
			ZECXMR: 'XMR_ZEC',
			STRATBTC: 'BTC_STRAT',
			NXCBTC: 'BTC_NXC',
			PASCBTC: 'BTC_PASC',
			GNTBTC: 'BTC_GNT',
			GNTETH: 'ETH_GNT',
			GNOBTC: 'BTC_GNO',
			GNOETH: 'ETH_GNO',
			BCHBTC: 'BTC_BCH',
			BCHETH: 'ETH_BCH',
			BCHUSD: 'USDT_BCH',
			ZRXBTC: 'BTC_ZRX',
			ZRXETH: 'ETH_ZRX',
			CVCBTC: 'BTC_CVC',
			CVCETH: 'ETH_CVC',
			OMGBTC: 'BTC_OMG',
			OMGETH: 'ETH_OMG',
			GASBTC: 'BTC_GAS',
			GASETH: 'ETH_GAS',
			STORJBTC: 'BTC_STORJ'
		};

		this.options = Object.assign({
			url: 'wss://api2.poloniex.com',
		}, this.options);
	}

	connect(pair) {
    if (!super.connect(pair))  
      return;

    this.api = new WebSocket(this.getUrl());

		this.api.on('message', event => this.emitData(this.format(event)));

		this.api.on('open', event => {
      this.api.send(JSON.stringify({
        command: 'subscribe',
        channel: this.pair,
      }));

      this.emitOpen(event);
    });

		this.api.on('close', this.emitClose.bind(this));

    this.api.on('error', this.emitError.bind(this));
	}

	disconnect() {
    if (!super.disconnect()) {
      return;
		}

    if (this.api && this.api.readyState < 2) {
      this.api.close();
    }
	}

	format(event) {
		const json = JSON.parse(event);

    if (!json || json.length !== 3) {
      return;
    }
		
		if (json[2] && json[2].length) {
			return json[2].filter(result => result[0] === 't').map(trade => [
				+new Date(trade[5] * 1000),
				+trade[3],
				+trade[4],
				trade[2]
			]);
		}
	}

}

module.exports = Poloniex;