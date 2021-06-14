<template>
  <ul class="counters">
    <li v-for="(step, index) in activeSteps" :key="index" v-bind:duration="step.duration" class="counter">
      <div class="counter__side -buy" v-bind:style="{ width: (step.buy / (step.buy + step.sell)) * 100 + '%' }">
        <span v-if="!countersCount">{{ $root.formatAmount(step.buy) }}</span>
        <span v-else>{{ step.buy }}</span>
      </div>
      <div class="counter__side -sell" v-bind:style="{ width: (step.sell / (step.buy + step.sell)) * 100 + '%' }">
        <span v-if="!countersCount">{{ $root.formatAmount(step.sell) }}</span>
        <span v-else>{{ step.sell }}</span>
      </div>
    </li>
  </ul>
</template>

<script>
import { mapState } from 'vuex'

import { getHms } from '../utils/helpers'

import socket from '../services/socket'

const CHUNK = {
  timestamp: null,
  buy: 0,
  sell: 0
}

const COUNTERS = []

export default {
  data() {
    return {
      topElement: {},
      steps: []
    }
  },
  computed: {
    ...mapState('app', ['actives']),
    ...mapState('settings', ['preferQuoteCurrencySize', 'thresholds', 'liquidationsOnly', 'countersSteps', 'countersCount', 'countersGranularity']),
    activeSteps: function() {
      return this.steps.filter(a => a.hasData)
    }
  },
  created() {
    socket.$on('sums', this.onSums)

    this.onStoreMutation = this.$store.subscribe(mutation => {
      switch (mutation.type) {
        case 'settings/SET_PAIR':
          this.createCounters()
          break
        case 'settings/REPLACE_COUNTERS':
        case 'settings/TOGGLE_LIQUIDATIONS_ONLY':
        case 'settings/TOGGLE_COUNTERS_COUNT':
          this.createCounters()
          break
      }
    })

    this.createCounters()

    this._populateCountersInterval = setInterval(this.populateCounters.bind(this), this.countersGranularity)
  },
  mounted() {},
  beforeDestroy() {
    socket.$off('sums', this.onSums)

    this.onStoreMutation()

    clearInterval(this._populateCountersInterval)
  },
  methods: {
    onSums(sums) {
      const volume = {
        buy: sums.vbuy,
        sell: sums.vsell
      }

      if (this.liquidationsOnly) {
        volume.buy = sums.lbuy
        volume.sell = sums.lsell
      } else if (this.countersCount) {
        volume.buy = sums.cbuy
        volume.sell = sums.csell
      }

      if (volume.buy || volume.sell) {
        if (!CHUNK.timestamp) {
          CHUNK.timestamp = sums.timestamp
        }

        CHUNK.buy += volume.buy
        CHUNK.sell += volume.sell

        for (let i = 0; i < this.steps.length; i++) {
          this.steps[i].buy += volume.buy
          this.steps[i].sell += volume.sell
        }
      }
    },
    clearCounters() {
      COUNTERS.splice(0, COUNTERS.length)
      CHUNK.timestamp = null
      CHUNK.buy = CHUNK.sell = 0

      this.steps.splice(0, this.steps.length)
    },
    createCounters() {
      this.clearCounters()

      for (let step of this.countersSteps) {
        COUNTERS.push({
          duration: step,
          chunks: []
        })
      }

      for (let counter of COUNTERS) {
        const first = COUNTERS.indexOf(counter) === 0

        this.steps.push({
          duration: getHms(counter.duration),
          buy: 0,
          sell: 0,
          hasData: first
        })
      }

      setTimeout(() => {
        const counterElement = this.$el.querySelector('.counter:first-child')
        this.topElement.buy = counterElement.children[0]
        this.topElement.sell = counterElement.children[1]
      })
    },
    populateCounters() {
      const now = +new Date()

      if (CHUNK.timestamp) {
        COUNTERS[0].chunks.push({
          timestamp: CHUNK.timestamp,
          buy: CHUNK.buy,
          sell: CHUNK.sell
        })

        CHUNK.timestamp = null
        CHUNK.buy = 0
        CHUNK.sell = 0
      }

      let chunksToDecrease = []
      let downgradeBuy
      let downgradeSell

      for (let i = 0; i < COUNTERS.length; i++) {
        if (chunksToDecrease.length) {
          Array.prototype.push.apply(COUNTERS[i].chunks, chunksToDecrease.splice(0, chunksToDecrease.length))

          if (!this.steps[i].hasData) {
            this.steps[i].hasData = true
          }
        }

        downgradeBuy = 0
        downgradeSell = 0

        let to = 0

        for (let j = 0; j < COUNTERS[i].chunks.length; j++) {
          downgradeBuy += COUNTERS[i].chunks[j].buy
          downgradeSell += COUNTERS[i].chunks[j].sell
          if (COUNTERS[i].chunks[j].timestamp >= now - COUNTERS[i].duration) {
            to = j
            break
          }
        }

        if (to) {
          chunksToDecrease = COUNTERS[i].chunks.splice(0, to + 1)
          if (isNaN(this.steps[i].buy - downgradeBuy) || isNaN(this.steps[i].sell - downgradeSell)) debugger
          this.steps[i].buy -= downgradeBuy
          this.steps[i].sell -= downgradeSell
        }
      }
    }
  },
  getCountersRange() {
    const now = +new Date()
    return {
      from: now - this.countersSteps[this.countersSteps.length - 1],
      to: now
    }
  },
  getFirstPoint() {
    for (let i = COUNTERS.length - 1; i >= 0; i--) {
      for (let j = COUNTERS[i].chunks.length - 1; j >= 0; j--) {
        return COUNTERS[i].chunks[j].timestamp
      }
    }

    return null
  }
}
</script>

<style lang="scss">
.counters {
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  padding: 0;
  pointer-events: none;
}

.counter {
  display: flex;
  position: relative;

  &:before {
    content: attr(duration);
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 0.55em;
    background-color: rgba(black, 0.1);
    border-radius: 2px;
    padding: 0.34em 0.4em;
    font-size: 0.85em;
    text-align: center;
    pointer-events: none;
    line-height: 1;
    color: rgba(white, 0.75);
    font-family: monospace;
  }

  .highlight {
    position: absolute;
    top: -0.2em;
    animation: fly-high 2s $easeInExpo;
    opacity: 0;
    padding: 0.3em 0.4em;
    box-shadow: 0 1px 1px rgba(black, 0.5);
    box-shadow: 0 1px 16px rgba(black, 0.1);
    z-index: 10;
    font-size: 0.5em;
    font-weight: 600;
    font-family: 'Roboto Condensed';

    @keyframes fly-high {
      0% {
        opacity: 1;
        transform: translateY(-10%);
      }
      75% {
        opacity: 0.75;
      }
      100% {
        transform: translateY(-2em);
        opacity: 0;
      }
    }
  }

  &__side {
    display: flex;
    align-items: center;
    flex-grow: 1;

    span {
      position: relative;
      padding: 0.5em;
      font-size: 0.9em;
      display: block;
    }

    &.-buy {
      background-color: $green;

      .highlight {
        background-color: lighten($green, 10%);

        left: 0.5em;
      }
    }

    &.-sell {
      background-color: $red;
      justify-content: flex-end;

      .highlight {
        background-color: lighten($red, 10%);

        right: 0.5em;
      }
    }
  }
}

$num: 0;

@while $num < 10 {
  .counter:nth-child(#{$num}) .counter__side.-buy {
    background-color: desaturate(darken($green, if($num % 2 == 0, 1 * $num, 0.5 * $num)), $num);
  }

  .counter:nth-child(#{$num}) .counter__side.-sell {
    background-color: desaturate(darken($red, if($num % 2 == 0, 1 * $num, 0.5 * $num)), $num);
  }

  $num: $num + 1;
}
</style>
