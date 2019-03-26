<template>
	<div class="thresholds">
    <p>Hide anything below <editable :content="minimum" @output="$store.commit('setMinimumAmount', $event)"></editable></p>
    <div class="thresholds__items" ref="thresholdContainer">
      <div v-for="(threshold, index) in thresholds" :key="`threshold-${index}`" class="thresholds__handler" :class="{ '-selected': selectedIndex === index }" v-on:mousedown="startDrag($event, index)" :data-amount="$root.formatAmount(threshold.amount)"></div>
    </div>
    <div class="threshold-panel" v-if="selectedIndex !== null">
      <a href="#" class="threshold-panel__close icon-cross" v-on:click="selectedIndex = null"></a>
      <div class="form-group mb8">
        <label>Amount</label>
        <input type="text" class="form-control" :value="thresholds[selectedIndex].amount">
      </div>
      <div class="form-group">
        <label>Gif</label>
        <input type="text" class="form-control" :value="thresholds[selectedIndex].gif">
      </div>
    </div>
	</div>
</template>

<script>
import { mapState } from 'vuex';

export default {
	data() {
		return {
      isDragging: false,
      selectedIndex: null,
      selectedElement: null,
		}
	},
  computed: {
    ...mapState([
      'minimum',
      'thresholds',
    ])
  },
  created() {
    const amounts = this.thresholds.map(threshold => threshold.amount);

    this.maximum = Math.max.apply(null, amounts);
  },
  mounted() {
    this.refresh();

    this._doDrag = this.doDrag.bind(this);

    window.addEventListener('mousemove', this._doDrag, false);

    this._endDrag = this.endDrag.bind(this);

    window.addEventListener('mouseup', this._endDrag, false);

    this._doResize = this.refresh.bind(this);

    window.addEventListener('resize', this._doResize, false);
  },
  beforeDestroy() {
    window.removeEventListener('mousemove', this._doDrag);
    window.removeEventListener('mouseup', this._endDrag);
    window.removeEventListener('resize', this._doResize);
  },
	methods: {
    startDrag(event, index) {
      this.selectedIndex = index;
      this.selectedElement = event.target;
    },
    doDrag(event) {
      if (this.selectedElement === null) {
        return;
      }

      const minLog = Math.log(this.minimum);

      const left = Math.max(0, Math.min(this.width, event.pageX - this.offsetLeft));
      const minLeft = Math.log(this.minimum) / Math.log(this.maximum) * this.width;
      const amount = Math.exp(((minLeft + (left / this.width) * (this.width - minLeft)) / this.width) * Math.log(this.maximum));

      this.selectedElement.style.left = left + 'px';

      this.$store.commit('setThresholdAmount', {index: this.selectedIndex, value: this.$root.formatPrice(amount)});
    },
    endDrag(event) {
      this.selectedElement = null;
    },
    refresh() {
      this.offsetLeft = this.$refs.thresholdContainer.getBoundingClientRect().left;
      this.width = this.$refs.thresholdContainer.clientWidth;

      const handlers = this.$refs.thresholdContainer.children;

      const minLog = Math.log(this.minimum);
      const maxLog = Math.log(this.maximum) - minLog;

      for (let i = 0; i < this.thresholds.length; i++) {
        const handler = handlers[i];
        const threshold = this.thresholds[i];
        const posLog = Math.log(threshold.amount) - minLog;
        const posPx = this.width * (posLog / maxLog);

        handler.style.left = posPx + 'px';
      }
    }
	}
}
</script>

<style lang='scss'>
@import '../assets/sass/variables';

.thresholds {
  position: relative;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;

  &__items {
    margin: 2.5em 0 1em;
    height: .5em;
    border-radius: 2px;
    background-color: rgba(white, .2);
    left: 0;
    right: 0;
  }

  &__handler {
    position: absolute;
    width: 1em;
    height: 1em;
    background-color: white;
    margin-top: -.25em;
    margin-left: -.5em;
    border-radius: 50%;
    transition: box-shadow .2s $easeElastic;
    cursor: move;

    &:before {
      position: absolute;
      content: attr(data-amount);
      top: -1.5em;
      left: 50%;
      transform: translateX(-50%);
    }

    &:after {
      display: none;
      position: absolute;
      content: '';
      width: 0px;
      height: 0px;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-bottom: 8px solid rgba(255, 255, 255, 0.2);
      top: 2.1em;
      left: -2px;
    }

    &.-selected {
      box-shadow: 0 0 0 10px rgba(white, .2);

      &:after {
        display: block;
      }
    }
  }
}

.threshold-panel {
  position: relative;
  background-color: rgba(white, .2);
  border-radius: 2px;
  padding: 16px;
  margin-top: 1.5rem;

  &__close {
    position: absolute;
    opacity: .5;
    right: 0;
    top: 0;
    padding: 1em;

    &:hover {
      opacity: 1;
    }
  }
}
</style>
