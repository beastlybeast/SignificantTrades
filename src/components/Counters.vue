<template>
	<div id="counters" class="counters">
    <ul>
      <li v-for="(sum, index) of stackedSums" :key="`sum-${index}`" v-if="!hideIncompleteCounter || index <= completed" class="counters__item">
        <div class="counter__index">
          <editable :content="labels[index]" @output="updateCounterStep(index, $event)"></editable>
        </div>
        <div class="counter__up" v-bind:style="{ flexBasis: (sum[0] / (sum[0] + sum[1]) * 100) + '%' }" :data-amount="$root.formatAmount(sum[0], 2)"></div>
        <div class="counter__down" v-bind:style="{ flexBasis: (sum[1] / (sum[0] + sum[1]) * 100) + '%' }" :data-amount="$root.formatAmount(sum[1], 2)"></div>
        <div class="counter__delete icon-cross" v-on:click="deleteCounter(index)"></div>
      </li>
    </ul>
    <!-- <div class="counters__add"><i class="icon-add"></i> Add step</div> -->
	</div>
</template>

<script>
import { mapState } from 'vuex';

import socket from '../services/socket';

export default {
  data() {
    return {
      labels: [],
      strictSums: [],
      stackedSums: [],
			counters: [],
			complete: 0,
      queue: [0, 0]
    };
  },
  computed: {
    ...mapState([
			'pair',
			'actives',
			'countersSteps',
      'counterPrecision',
      'hideIncompleteCounter',
    ])
  },
  created() {
    const now = +new Date();

    if (this.counters.length < this.countersSteps.length) {
      for (let i = this.counters.length; i < this.countersSteps.length; i++) {
        this.labels.push(this.$root.ago(now - this.countersSteps[i]));
        this.counters.push([]);
        this.strictSums.push([0, 0]);
        this.stackedSums.push([0, 0]);
      }
    }

    this.onStoreMutation = this.$store.subscribe((mutation, state) => {
      switch (mutation.type) {
        case 'setCounterStep':
        case 'replaceCounterSteps':
        case 'reloadExchangeState':
          this.rebuildCounters();
          break;
      }
    });

    socket.$on('trades.queued', this.onTrades);
    socket.$on('historical', this.onFetch);

    this.rebuildCounters();
  },
  beforeDestroy() {
    socket.$off('trades.queued', this.onTrades);
    socket.$off('historical', this.onFetch);

		clearInterval(this.countersRefreshCycleInterval);

    this.onStoreMutation();
  },
  methods: {
    onTrades(trades, upVolume, downVolume) {
      const now = +new Date();

			this.queue[0] += upVolume;
      this.queue[1] += downVolume;

      for (let index = 0; index < this.stackedSums.length; index++) {
        this.$set(this.stackedSums[index], 0, this.stackedSums[index][0] + upVolume);
        this.$set(this.stackedSums[index], 1, this.stackedSums[index][1] + downVolume);
      }
    },
    onFetch(trades, willReplace) {
			if (willReplace) {
        for (let index = 0; index < this.counters.length; index++) {
          this.counters[index] = [];
          this.strictSums[index] = [0, 0];
          this.$set(this.stackedSums[index], 0, 0);
          this.$set(this.stackedSums[index], 1, 0);
        }
      }

      const stacks = this.stackTrades(trades);

      if (stacks.length) {
        this.populateCounters(stacks);
      }
    },
		updateCounters() {
      if (!this.counters.length) {
        return;
      }

      const now = +new Date();

      if (this.queue[0] || this.queue[1]) {
        this.counters[0].push([now, this.queue[0], this.queue[1]]);
        this.strictSums[0][0] += this.queue[0];
        this.strictSums[0][1] += this.queue[1];

        this.queue[0] = this.queue[1] = 0;
      }

			let stepIndex = 0;
      let stackedUpVolume = 0;
      let stackedDownVolume = 0;

			for (let step of this.countersSteps) {
        let upVolume = 0;
        let downVolume = 0;

        let expiredUntilIndex = -1;

        for (let i = 0; i < this.counters[stepIndex].length; i++) {
          if (expiredUntilIndex === -1) {
            upVolume += this.counters[stepIndex][i][1];
            downVolume += this.counters[stepIndex][i][2];
          }

          if (this.counters[stepIndex][i][0] < now - step) {
            expiredUntilIndex = i;

            break;
          }
        }

        if (expiredUntilIndex >= 0) {
          const expired = this.counters[stepIndex].splice(0, expiredUntilIndex + 1);

          this.strictSums[stepIndex][0] -= upVolume;
          this.strictSums[stepIndex][1] -= downVolume;

          if (this.counters[stepIndex + 1]) {
            this.counters[stepIndex + 1].push(...expired);
            this.strictSums[stepIndex + 1][0] += upVolume;
            this.strictSums[stepIndex + 1][1] += downVolume;

            if (this.complete < stepIndex) {
              this.complete = stepIndex;
            }
          }
        }

        stackedUpVolume += this.strictSums[stepIndex][0];
        stackedDownVolume += this.strictSums[stepIndex][1];

        this.$set(this.stackedSums[stepIndex], 0, parseFloat(stackedUpVolume));
        this.$set(this.stackedSums[stepIndex], 1, parseFloat(stackedDownVolume));

        stepIndex++;
			}
		},
    stackTrades(trades) {
      const now = +new Date();
      const minTimestampForCounter = this.countersSteps[this.countersSteps.length - 1];

      let stacks = [];

      for (let trade of trades) {
        if (this.actives.indexOf(trade[0]) === -1 || trade[1] < now - minTimestampForCounter) {
          continue;
        }

        const isBuy = +trade[4] ? true : false;

        if (stacks.length && trade[1] - stacks[stacks.length - 1][0] < this.counterPrecision) {
          stacks[stacks.length - 1][isBuy ? 1 : 2] += +trade[3];
        } else {
          stacks.push([+trade[1], isBuy ? +trade[3] : 0, !isBuy ? +trade[3] : 0]);
        }
      }

      return stacks;
    },
    populateCounters(stacks) {
      const now = +new Date();
      
      let last = 0;

      for (let stack of stacks) {
        for (let index = 0; index < this.countersSteps.length; index++) {
          if (stack[0] > now - this.countersSteps[index]) {
            this.counters[index].push(stack);
            this.strictSums[index][0] += stack[1];
            this.strictSums[index][1] += stack[2];

            break;
          }
        }
      }

      let stackedUpVolume = 0;
      let stackedDownVolume = 0;
      let completed = 0;

      for (let index = 0; index < this.countersSteps.length; index++) {
        this.counters[index] = this.counters[index].sort((a, b) => a[0] - b[0]);

        stackedUpVolume += this.strictSums[index][0];
        stackedDownVolume += this.strictSums[index][1];

        this.$set(this.stackedSums[index], 0, parseFloat(stackedUpVolume));
        this.$set(this.stackedSums[index], 1, parseFloat(stackedDownVolume));

        if (stacks[0][0] < now - this.countersSteps[index] * .99) {
          completed = index;
        }
      }

      this.completed = completed;
    },
    updateCounterStep(index, value) {
      if (!value) {
        return this.$store.commit('setCounterStep', {index: index, value: null})
      }

			let milliseconds = parseFloat(value);

			if (isNaN(milliseconds)) {
				return false;
			}

			if (/[\d.]+s/.test(value)) {
				milliseconds *= 1000;
			} else if (/[\d.]+h/.test(value)) {
				milliseconds *= 1000 * 60 * 60;
      } else {
				milliseconds *= 1000 * 60;
      }

      return this.$store.commit('setCounterStep', {index: index, value: milliseconds})
    },
    rebuildCounters() {
      clearInterval(this.countersRefreshCycleInterval);

      const now = +new Date();
      
      this.completed = 0;
      this.labels.splice(0, this.labels.length);
      this.counters.splice(0, this.counters.length);
      this.strictSums.splice(0, this.strictSums.length);
      this.stackedSums.splice(0, this.stackedSums.length);

      for (let i = 0; i < this.countersSteps.length; i++) {
        this.labels.push(this.$root.ago(now - this.countersSteps[i]));
        this.counters.push([]);
        this.strictSums.push([0, 0]);
        this.stackedSums.push([0, 0]);
      }

      if (socket.trades.length) {
        this.populateCounters(this.stackTrades(socket.trades));
      }

      this.countersRefreshCycleInterval = window.setInterval(this.updateCounters.bind(this), this.counterPrecision);
    },
    deleteCounter(index) {
      if (this.countersSteps.length === 1) {
        this.$store.commit('toggleCounters', false);

        return;
      }

      this.$store.commit('setCounterStep', {index: index, value: null});
    }
  },
};
</script>

<style lang='scss'>
@import '../assets/sass/variables';

.counters__add {
  background-color: rgba(white, .1);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 2em;
  font-size: .8em;
  cursor: pointer;

  transition: background-color .2s $easeOutExpo;

  i.icon-add {
    margin-right: .5em;
  }

  &:hover {
    background-color: $blue;
  }
}

.counters {
  ul {
    margin: 0;
    padding: 0;
    display: flex;
    flex-flow: column nowrap;

    li {
      display: flex;
      flex-flow: row nowrap;
      position: relative;
      align-items: stretch;
    }
  }
}

.counters__item {
  > div {
    padding: .25em;
  }

  &:hover {
    .counter__delete {
      flex-basis: 2.35em;

      &:before {
        transform: none;
        opacity: 1;
      }
    }
  }

  .counter__delete {
    color: white;
    background-color: rgba(black, .8);
    transition: flex-basis .2s $easeOutExpo;
    font-size: .8em;
    flex-basis: 0px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
    cursor: pointer;

    &:before {
      display: inline-block;
      transform: rotateZ(45deg);
      opacity: 0;
      transition: all .2s $easeOutExpo;
    }
  }
}

.counter__index {
  flex-basis: 2.5em;
  white-space: nowrap;
  text-align: left;
  flex-shrink: 0;
  background-color: rgba(black, .05);
  transition: padding .2s $easeOutExpo;
  position: relative;

  [contenteditable] {
    padding: 4px;
    font-size: .8em;
  }
}

.counter__up,
.counter__down {
  position: relative;
  font-family: monospace;
  transition: flex-basis .4s $easeOutExpo;

  &:before {
    content: attr(data-amount);
    position: absolute;
    margin: .1em 0;
    font-size: 1.1em;
    z-index: 1;
  }
}

.counter__up {
  text-align: left;
  background-color: rgba(lighten($green, 10%), .75);
  color: darken($green, 10%);

  &:before {
    left: .25em;
  }
}

.counter__down {
  text-align: right;
  background-color: rgba(lighten($red, 10%), .75);
  color: darken($red, 10%);

  &:before {
    right: .25em;
  }
}
</style>