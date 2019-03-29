<template>
	<div id="exchanges" class="exchanges">
		<div v-for="(exchange, index) in connectedExchanges" v-bind:key="index" v-bind:class="'-' + exchange.id + ' -' + exchange.side" v-on:click="$store.commit('toggleExchangeVisibility', exchange.id)">
			<div class="exchange__name">{{ exchange.id }} <i v-if="exchanges[exchange.id].hidden" class="icon-eye-crossed"></i></div>
			<div class="exchange__price" v-html="exchange.price ? $root.formatPrice(exchange.price) : `&nbsp;`"></div>
		</div>
	</div>
</template>

<script>
import { mapState } from 'vuex';

import socket from '../services/socket';

const storedPrices = {};

export default {
  data() {
    return {
			exchangesAverage: {},
			exchangesDirection: {},
			connectedExchanges: [],
    };
  },
  computed: {
    ...mapState([
			'actives',
			'exchanges',
    ])
  },
  created() {
		this.connectedExchanges = socket.exchanges;

		socket.$on('trades.queued', this.onTrades);

		this._priceComparisonInterval = setInterval(this.updatePriceAction.bind(this), 2000);
  },
  beforeDestroy() {
		socket.$off('trades.queued', this.onTrades);

		clearInterval(this._priceComparisonInterval);
  },
  methods: {
		onTrades() {
			this.connectedExchanges = socket.exchanges
				.filter(a => a.connected)
				.sort((a, b) => a.price - b.price);
		},
		updatePriceAction() {
			socket.exchanges.forEach((exchange, index) => {
				if (this.actives.indexOf(exchange.id) === -1 || !exchange.price) {
					return;
				}

				if (!storedPrices[exchange.id]) {
					storedPrices[exchange.id] = [];
				}

				if (!storedPrices[exchange.id].length || storedPrices[exchange.id][storedPrices[exchange.id].length - 1] !== exchange.price) {
					storedPrices[exchange.id].push(exchange.price);
					storedPrices[exchange.id].splice(0, storedPrices[exchange.id].length - 5);
				}

				socket.exchanges[index].avg = storedPrices[exchange.id].reduce((a, b) => a + b) / storedPrices[exchange.id].length;
				socket.exchanges[index].side = exchange.price > exchange.avg ? 'up' : exchange.price < exchange.avg ? 'down' : 'neutral';
			});
		}
  }
};
</script>

<style lang='scss'>
@import '../assets/sass/variables';

#exchanges {
	display: flex;
	flex-direction: row;

	min-height: 1.5em;

	> div {
    padding: .5em;
    display: flex;
    flex-direction: row;
    background-color: rgba(white, .2);
    font-size: .9em;
    align-items: flex-start;
    flex-grow: 1;
    flex-basis: 0;
		position: relative;

		cursor: pointer;

		.exchange__name {
			text-transform: uppercase;
			opacity: .8;
			font-size: .9em;
			letter-spacing: 1px;
			background-position: left;
			background-repeat: no-repeat;
			text-indent: -99999px;
			width: 1.5em;
		}

		.exchange__price {
			font-family: monospace;
		}

		&.-up {
			background-color: rgba(lighten($green, 20%), .5);
			color: darken($green, 20%);
		}

		&.-down {
			background-color: rgba(lighten($red, 20%), .5);
			color: darken($red, 20%);
		}

		&.-neutral {
			background-color: rgba(black, .2);
		}

    @each $exchange in $exchanges {
      &.-#{$exchange} .exchange__name {
        background-image: url("/static/exchanges/#{$exchange}.svg");
      }
    }
	}
}
</style>