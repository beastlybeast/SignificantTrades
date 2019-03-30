<template>
	<div id="exchanges" class="exchanges condensed" @mouseenter="hovering = true" @mouseleave="hovering = false">
		<div v-for="(exchange, index) in connectedExchanges" v-bind:key="index" v-bind:class="'-' + exchange.id + ' -' + exchange.side" v-on:click="$store.commit('toggleExchangeVisibility', exchange.id)">
			<div class="exchange__price" :class="{ '-hidden': exchanges[exchange.id].hidden }">
				{{ $root.formatPrice(exchange.price) }} &nbsp;
			</div>
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
			hovering: false,
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
				socket.exchanges[index].side = !exchange.price ? 'pending' : exchange.price > exchange.avg ? 'up' : exchange.price < exchange.avg ? 'down' : 'neutral';
			});

			if (this.hovering) {
				return;
			}
			
			this.connectedExchanges = socket.exchanges
				.filter(a => a.connected)
				.sort((a, b) => a.price - b.price);
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
    font-size: .9em;
    align-items: center;
    flex-grow: 1;
    flex-basis: 0;
		position: relative;
		line-height: 1.1;
		background-position: .5em;
		background-repeat: no-repeat;
		background-size: 1em;

		cursor: pointer;

		.exchange__price {
			margin-left: 1.25em;
			white-space: nowrap;

			&.-hidden {
				text-decoration: line-through;
			}
		}

    &.-up {
      background-color: transparent;
      color: lighten($green, 10%);
    }

    &.-down {
      background-color: transparent;
      color: $red;
    }

    &.-neutral {
      color: rgba(white, .75);
			font-style: italic;
    }

    &.-pending {
      background-color: rgba(white, .2);
      opacity: .5;
    }

    @each $exchange in $exchanges {
      &.-#{$exchange} {
        background-image: url("/static/exchanges/#{$exchange}.svg");
      }
    }
	}
}
</style>