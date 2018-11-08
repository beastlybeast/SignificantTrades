<template>
	<div class="stats">
    <div>
      <div class="stats__label">Trades/min</div>
      <div class="stats__value">
        {{rate.live}}
        <sup>({{rate.side}}{{(100 - (rate.average / rate.live) * 100).toFixed()}}%)</sup>
      </div>
    </div>
    <div>
      <div class="stats__label">Buys/min</div>
      <div class="stats__value">
        <span class="icon-commodity"></span> {{up.live.toFixed()}}
        <sup>({{up.side}}{{(100 - (up.average / up.live) * 100).toFixed()}}%)</sup>
      </div>
    </div>
    <div>
      <div class="stats__label">Sells/min</div>
      <div class="stats__value">
        <span class="icon-commodity"></span> {{down.live.toFixed()}}
        <sup>({{down.side}}{{(100 - (down.average / down.live) * 100).toFixed()}}%)</sup>
      </div>
    </div>
    <div>
      <div class="stats__label">Volume/min</div>
      <div class="stats__value"><span class="icon-commodity"></span> {{(up.live + down.live).toFixed()}}</div>
    </div>
	</div>
</template>

<script>
import { mapState } from 'vuex';

import socket from '../services/socket';

export default {
  data() {
    return {
      timestamp: null,
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
    ...mapState([
			'statsPeriod',
    ])
  },
  created() {
    const now = +new Date();

    this.onStoreMutation = this.$store.subscribe((mutation, state) => {
      switch (mutation.type) {
        case 'statsPeriod':
          this.rebuildStats();
          break;
      }
    });

    socket.$on('trades', this.onTrades);
    socket.$on('historical', this.onFetch);

    this.rebuildStats();
  },
  beforeDestroy() {
    socket.$off('trades', this.onTrades);
    socket.$off('historical', this.onFetch);

		clearInterval(this.statsRefreshCycleInterval);

    this.onStoreMutation();
  },
  methods: {
    onTrades(trades, upVolume, downVolume) {
      this.rate.count += trades.length;
      this.up.count += upVolume;
      this.down.count += downVolume;
    },
    onFetch(trades, from, to) {
      const now = +new Date();

			if (to > now - this.statsPeriod) {
        this.rebuildStats();
      }
    },
    rebuildStats() {
      clearInterval(this.statsRefreshCycleInterval);

      console.log('rebuildstats');

      const now = +new Date();

      this.timestamp = now - this.statsPeriod;
      this.rate.average = this.up.average = this.down.average = null;
      this.rate.count = this.up.count = this.down.count = 0;

      for (let i = socket.trades.length - 1; i >= 0; i--) {
        if (socket.trades[i][1] < now - this.statsPeriod) {
          break;
        }

        this.rate.count++;
        this[+socket.trades[i][4] ? 'up' : 'down'].count += +socket.trades[i][3];
      }

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
  background-color: rgba(white, .1);
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  cursor: pointer;

  > div {
    padding: 15px;
  }

  .stats__label {
    opacity: .5;
    text-transform: uppercase;
    font-size: .75em;
  }

  .stats__value {
    text-align: right;
  }
}
</style>