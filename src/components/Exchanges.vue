<template>
	<div id="exchanges" class="exchanges">
		<div v-if="connectedExchanges.length" v-for="(exchange, index) in connectedExchanges" v-bind:key="index" v-bind:class="'exchange__action-' + exchange.side" v-on:click="$store.commit('toggleExchangeVisibility', exchange.id)">
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
			exchangesDirection: {}
    };
  },
  computed: {
    ...mapState([
			'actives',
			'exchanges',
    ]),
		connectedExchanges() {
			return socket.exchanges
				.filter(a => a.connected)
				.sort((a, b) => a.price - b.price);
		}
  },
  created() {
		this._priceComparisonInterval = setInterval(this.updatePriceAction.bind(this), 2000);
  },
  beforeDestroy() {
		clearInterval(this._priceComparisonInterval);
  },
  methods: {
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

	> div {
    padding: .5em;
    display: flex;
    flex-direction: column;
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
		}

		.exchange__price {
			font-family: monospace;
		}

		&.exchange__action-up {
			background-color: rgba(lighten($green, 20%), .5);
			color: darken($green, 20%);
		}

		&.exchange__action-down {
			background-color: rgba(lighten($red, 20%), .5);
			color: darken($red, 20%);
		}

		&.exchange__action-neutral {
			background-color: rgba(black, .2);
		}
	}
}
</style>