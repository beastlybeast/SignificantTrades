<template>
  <div id="stats" class="stats">
    <ul class="stats__items">
      <li
        v-tippy
        title="Number of trades"
      >
        <Measurement v-if="statsGraphs" ref="tradesMeasurement" :timeframe="statsGraphsTimeframe" :length="statsGraphsLength" />
        <div class="stats__label">TRADES</div>
        <div class="stats__value">
          {{ $root.formatAmount(totalOrders) }}
        </div>
      </li>
      <li
        v-tippy
        title="Average order"
      >
        <Measurement v-if="statsGraphs" ref="avgMeasurement" :timeframe="statsGraphsTimeframe" :length="statsGraphsLength" />
        <div class="stats__label">AVG</div>
        <div class="stats__value">
          <span class="icon-currency"></span>
          {{ $root.formatAmount(totalVolume / totalOrders, 2) }}
        </div>
      </li>
      <li
        v-tippy
        title="Volume delta"
      >
        <Measurement v-if="statsGraphs" ref="volDeltaMeasurement" :timeframe="statsGraphsTimeframe" :length="statsGraphsLength" />
        <div class="stats__label">VOL &Delta;</div>
        <div class="stats__value">
          <span class="icon-currency"></span>
          {{ $root.formatAmount(volDelta, 1) }}
        </div>
      </li>
      <li
        v-tippy
        title="Order delta"
      >
        <Measurement v-if="statsGraphs" ref="countDeltaMeasurement" :timeframe="statsGraphsTimeframe" :length="statsGraphsLength" />
        <div class="stats__label">TRADES &Delta;</div>
        <div class="stats__value">
          {{ $root.formatAmount(countDelta, 1) }}
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
import { mapState } from 'vuex'

import socket from '../services/socket'

import Measurement from './ui/Measurement.vue'

export default {
  components: {
    Measurement
  },
  data() {
    return {
      timestamp: null,
      periodLabel: null,
      countUp: {
        average: null,
        live: null,
        count: 0,
      },
      countDown: {
        average: null,
        live: null,
        count: 0,
      },
      volUp: {
        average: null,
        live: null,
        count: 0,
      },
      volDown: {
        average: null,
        live: null,
        count: 0,
      },
    }
  },
  computed: {
    totalOrders() {
      return this.countUp.live + this.countDown.live
    },
    totalVolume() {
      return this.volUp.live + this.volDown.live
    },
    countDelta() {
      return this.countUp.live - this.countDown.live
    },
    volDelta() {
      return this.volUp.live - this.volDown.live
    },
    ...mapState([
      'statsPeriod',
      'statsGraphs',
      'statsGraphsTimeframe',
      'statsGraphsLength',
      'preferQuoteCurrencySize',
      'actives'
    ]),
  },
  created() {
    const now = +new Date()

    this.onStoreMutation = this.$store.subscribe((mutation, state) => {
      switch (mutation.type) {
        case 'reloadExchangeState':
        case 'setStatsPeriod':
        case 'toggleBaseCurrencySize':
          this.rebuildStats()
          break
      }
    })

    socket.$on('trades.instant', this.onTrades)
    socket.$on('historical', this.onFetch)
  },
  mounted() {
    this.rebuildStats()
  },
  beforeDestroy() {
    socket.$off('trades.instant', this.onTrades)
    socket.$off('historical', this.onFetch)

    clearInterval(this.statsRefreshCycleInterval)

    this.onStoreMutation()
  },
  methods: {
    onTrades(trades, upVolume, downVolume) {
      for (let i = 0; i < trades.length; i++) {
        const side = trades[i][4] > 0 ? 'Up' : 'Down'

        this['count' + side].count++
        this['vol' + side].count += trades[i][3] * (this.preferQuoteCurrencySize ? trades[i][2] : 1)
      }
    },
    onFetch(trades, from, to) {
      const now = +new Date()

      if (to > now - this.statsPeriod) {
        this.rebuildStats()
      }
    },
    rebuildStats() {
      clearInterval(this.statsRefreshCycleInterval)

      const now = +new Date()

      this.periodLabel = this.$root.ago(now - this.statsPeriod)
      this.timestamp = now - this.statsPeriod
      this.countUp.average = this.countDown.average = this.volUp.average = this.volDown.average = null
      this.countUp.count = this.countDown.count = this.volUp.count = this.volDown.count = 0

      if (this.statsGraphs) {
        this.$refs.tradesMeasurement.clear();
        this.$refs.avgMeasurement.clear();
        this.$refs.volDeltaMeasurement.clear();
        this.$refs.countDeltaMeasurement.clear();
      }

      socket.trades
        .filter(
          (trade) =>
            this.actives.indexOf(trade[0]) !== -1 &&
            trade[1] >= now - this.statsPeriod
        )
        .forEach((trade) => {
          const side = trade[4] > 0 ? 'Up' : 'Down'

          this['count' + side].count++
          this['vol' + side].count += trade[3] * (this.preferQuoteCurrencySize ? trade[2] : 1)
        })

      this.updateStats(now)

      this.statsRefreshCycleInterval = window.setInterval(
        this.updateStats.bind(this),
        1000
      )
    },
    updateStats(timestamp = null) {
      const now = timestamp || +new Date()

      if (this.countUp.average !== null || this.countDown.average !== null) {
        this.countUp.live = Math.ceil(
          (this.countUp.count + this.countUp.average) /
            (1 + (now - this.timestamp) / this.statsPeriod)
        )
        this.countDown.live = Math.ceil(
          (this.countDown.count + this.countDown.average) /
            (1 + (now - this.timestamp) / this.statsPeriod)
        )
        this.volUp.live = parseFloat(
          (this.volUp.count + this.volUp.average) /
            (1 + (now - this.timestamp) / this.statsPeriod)
        )
        this.volDown.live = parseFloat(
          (this.volDown.count + this.volDown.average) /
            (1 + (now - this.timestamp) / this.statsPeriod)
        )
      } else {
        this.countUp.live = this.countUp.count
        this.countDown.live = this.countDown.count
        this.volUp.live = this.volUp.count
        this.volDown.live = this.volDown.count
      }

      if (now - this.timestamp >= this.statsPeriod) {
        this.timestamp = now
        this.countUp.average = parseInt(this.countUp.live)
        this.countDown.average = parseInt(this.countDown.live)
        this.volUp.average = parseFloat(this.volUp.live)
        this.volDown.average = parseFloat(this.volDown.live)
        this.countUp.count = this.countDown.count = this.volUp.count = this.volDown.count = 0
      }

      if (this.statsGraphs) {
        this.$refs.tradesMeasurement.append(this.totalOrders);
        this.$refs.avgMeasurement.append(this.totalOrders ? this.totalVolume / this.totalOrders : 0);
        this.$refs.volDeltaMeasurement.append(this.volDelta);
        this.$refs.countDeltaMeasurement.append(this.countDelta);
      }
    },
  },
}
</script>

<style lang="scss">
@import '../assets/sass/variables';

.stats {
  position: relative;
  background-color: rgba(white, 0.05);

  .stats__label {
    opacity: 0.5;
    font-size: 0.6em;
    letter-spacing: 1px;
  }

  .stats__value {
    text-align: right;
    white-space: nowrap;
    font-family: 'Roboto Condensed';
    z-index: 1;
  }

  .stats__items {
    display: flex;
    align-items: center;
    list-style: none;
    padding: 0;
    margin: 0;

    > li {
      display: flex;
      align-items: center;
      flex-grow: 1;
      flex-direction: column;
      flex-basis: 0;
      position: relative;

      &:hover .measurement {
        fill: $blue;
        opacity: 1;

        ~ .stats__label {
          opacity: .5;
        }
      }
    }

    .stats__label {
      margin-top: .5rem;
      z-index: 1;
    }

    .stats__value {
      margin-bottom: .5rem;
    }

    .measurement {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;

      opacity: .25;

      stroke: none; 
      fill: white;
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
}
</style>
