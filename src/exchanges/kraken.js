const Exchange = require('../Exchange');
const WebSocket = require('ws');

class Kraken extends Exchange {

	constructor(options) {
		super(options);

		this.id = 'kraken';
	}

	connect() {
		this.interval = setInterval(this.get.bind(this), options.interval || 3000);

		this.emitOpen();

		return this;
	}

	get() {
		axios.get(this.getUrl())
			.then(response => this.emitData(this.format(response)))
			.catch(this.emitError);
	}
		
	disconnect() {
		clearInterval(this.interval);

		this.emitClose();

		return this;
	}
		
}

module.exports = Kraken;