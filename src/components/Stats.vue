<template>
	<div id="stats" class="stats">
    <div class="stats__infos">
      <div>{{periodLabel}}</div>
    </div>
    <ul class="stats__items">
      <li v-tippy v-bind:title="`Number of trades in the last ${periodLabel}`" v-bind:class="{ up: rate.live > rate.average }">
        <div class="stats__label">TRADES</div>
        <div class="stats__value">
          {{ $root.formatAmount(rate.live) }}
        </div>
      </li>
      <li>
        <div v-tippy class="stats__label" v-bind:title="`Average amount per trade over the last ${periodLabel}`">AVG trd.</div>
        <div class="stats__value">
          <span class="icon-currency" :class="{ 'icon-commodity': !this.statsCurrency }"></span> {{ $root.formatAmount(avgtrade / rate.live, 2) }}
        </div>
      </li>
      <li v-tippy v-bind:title="`Buys in the last ${periodLabel}`"  v-bind:class="{ up: up.live > up.average }">
        <div class="stats__label">BUYS</div>
        <div class="stats__value">
          <span class="icon-currency" :class="{ 'icon-commodity': !this.statsCurrency }"></span> {{ $root.formatAmount(up.live, 1) }}
        </div>
      </li>
      <li v-tippy v-bind:title="`Sells in the last ${periodLabel}`" v-bind:class="{ up: down.live > down.average }">
        <div class="stats__label">SELLS</div>
        <div class="stats__value">
          <span class="icon-currency" :class="{ 'icon-commodity': !this.statsCurrency }"></span> {{ $root.formatAmount(down.live, 1) }}
        </div>
      </li>
      <!-- 
        // Maybe useless
        <li v-tippy v-bind:title="`Total volume in the last ${periodLabel}`">
        <div class="stats__label">VOL</div>
        <div class="stats__value"><span class="icon-commodity"></span> {{$root.formatAmount(up.live + down.live, 1)}}</div>
      </li> -->
    </ul>
	</div>
</template>

<script>
import { mapState } from 'vuex';

import socket from '../services/socket';

export default {
  data() {
    return {
      timestamp: null,
      periodLabel: null,
      rate: {
        average: null,
        live: null,
        count: 0,
      },
      up: {
        average: null,
        live: null,
        count: 0,
      },
      down: {
        average: null,
        live: null,
        count: 0,
      }
    };
  },
  computed: {
     avgtrade() {
    	return this.up.live + this.down.live;
    },
    ...mapState([
			'statsPeriod',
      'statsCurrency',
      'actives',
    ])
  },
  created() {
    const now = +new Date();

    this.onStoreMutation = this.$store.subscribe((mutation, state) => {
      switch (mutation.type) {
        case 'reloadExchangeState':
        case 'setStatsPeriod':
        case 'toggleStatsCurrency':
          this.rebuildStats();
          break;
      }
    });

    socket.$on('trades.instant', this.onTrades);
    socket.$on('historical', this.onFetch);

    this.rebuildStats();
  },
  beforeDestroy() {
    socket.$off('trades.instant', this.onTrades);
    socket.$off('historical', this.onFetch);

		clearInterval(this.statsRefreshCycleInterval);

    this.onStoreMutation();
  },
  methods: {
    onTrades(trades, upVolume, downVolume) {
      this.rate.count += trades.length;

      if (this.statsCurrency) {
        this.up.count += trades.filter(trade => trade[4] > 0).map(trade => trade[3] * trade[2]).reduce((a, b) => a +b);
        this.down.count += trades.filter(trade => trade[4] < 1).trades.map(trade => trade[3] * trade[2]).reduce((a, b) => a +b);
      } else {
        this.up.count += upVolume;
        this.down.count += downVolume;
      }
    },
    onFetch(trades, from, to) {
      const now = +new Date();

			if (to > now - this.statsPeriod) {
        this.rebuildStats();
      }
    },
    rebuildStats() {
      clearInterval(this.statsRefreshCycleInterval);

      const now = +new Date();

      this.periodLabel = this.$root.ago(now - this.statsPeriod);
      this.timestamp = now - this.statsPeriod;
      this.rate.average = this.up.average = this.down.average = null;
      this.rate.count = this.up.count = this.down.count = 0;
 
      socket.trades
        .filter(trade => this.actives.indexOf(trade[0]) !== -1 && trade[1] >= now - this.statsPeriod)
        .forEach(trade => {
          this.rate.count++;

          if (this.statsCurrency) {
            this[+trade[4] > 0 ? 'up' : 'down'].count += (trade[3] * trade[2]);
          } else {
            this[+trade[4] > 0 ? 'up' : 'down'].count += trade[3];
          }
        })

      this.updateStats(now);

      this.statsRefreshCycleInterval = window.setInterval(this.updateStats.bind(this), 1000);
    },
    updateStats(timestamp = null) {
      const now = timestamp || +new Date();

      if (this.rate.average !== null) {
        this.rate.live = parseInt((this.rate.count + this.rate.average) / (1 + (now - this.timestamp) / this.statsPeriod));
        this.up.live = parseFloat((this.up.count + this.up.average) / (1 + (now - this.timestamp) / this.statsPeriod));
        this.down.live = parseFloat((this.down.count + this.down.average) / (1 + (now - this.timestamp) / this.statsPeriod));
        this.rate.side = this.rate.live > this.rate.average ? '+' : '';
        this.up.side = this.up.live > this.up.average ? '+' : '';
        this.down.side = this.down.live > this.down.average ? '+' : '';
      } else {
        this.rate.live = this.rate.count;
        this.up.live = this.up.count;
        this.down.live = this.down.count;
      }

      if (now - this.timestamp >= this.statsPeriod) {
        this.timestamp = now;
        this.rate.average = parseInt(this.rate.live);
        this.up.average = parseFloat(this.up.live);
        this.down.average = parseFloat(this.down.live);
        this.rate.count = this.up.count = this.down.count = 0;
      }
    }
  }
};
</script>

<style lang='scss'>
@import '../assets/sass/variables';

.stats {
  position: relative;
  background-color: rgba(white, .05);

  .stats__label {
    opacity: .5;
    font-size: .75em;
    padding: .75em 0 .25em;
  }

  .stats__value {
    text-align: right;
    font-weight: 600;
    white-space: nowrap;
    padding: .25em 0 .75em;

    &:after {
      font-family: 'icon';
      content: unicode($icon-down);
      color: lighten($red, 10%);
    }
  }

  .stats__items {
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    list-style: none;
    padding: 0;
    margin: 0;

    > li {
      display: flex;
      align-items: center;
      flex-grow: 0;
      flex-direction: column;
      flex-basis: auto;

      &.up {
        .stats__value:after {
          content: unicode($icon-up);
          color: lighten($green, 20%);
        }
      }
    }

    sup {
      font-size: 75%;
      display: none;
    }

    @media screen and (min-width: 768px) {
      sup {
        display: inline-block;
      }
    }
  }

  .stats__infos {
    display: none;
    position: absolute;
    top: 0;
    bottom: 0;
    width: 20%;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    text-align: right;

    > i {
      font-size: 60%;
      width: 70%;
    }

    > div {
      font-size: 1.25em;
      font-weight: 600;
      text-align: right;
      align-self: flex-end;
    }

    &:before {
      position: absolute;
      content: unicode($icon-stopwatch);
      font-family: 'icon';
      opacity: .1;
      pointer-events: none;
      font-size: 120px;
      bottom: 0;
      left: -60%;
      color: black;
    }

    @media screen and (min-width: 768px) {
      display: flex;
    }

    @media screen and (min-width: 992px) {
      &:before {
        font-size: 140px;
      }
    }
  }
}
</style>
