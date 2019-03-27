<template>
	<div class="thresholds">
    <chrome-picker v-if="picking !== null" ref="picker" :value="thresholds[picking.index][picking.side]" @input="updateColor"></chrome-picker>

    <div class="thresholds__bar" ref="thresholdContainer">
      <div v-for="(threshold, index) in thresholds" :key="`threshold-${index}`" class="thresholds__handler" :class="{ '-selected': selectedIndex === index }" v-on:mousedown="startDrag($event, index)" :data-amount="$root.formatAmount(threshold.amount, 2)"></div>
    </div>
    <div class="threshold-panel" v-if="selectedIndex !== null" :class="{ '-minimum': selectedIndex === 0 }">
      <div class="threshold-panel__caret" v-bind:style="{ left: this.selectedCaretPosition + 'px' }"></div>
      <a href="#" class="threshold-panel__close icon-cross" v-on:click="selectedIndex = null"></a>
      <h3>if amount > <editable :content="thresholds[selectedIndex].amount" @output="$store.commit('setThresholdAmount', {index: selectedIndex, value: $event})"></editable></h3>
      <div class="settings__column">
        <div class="form-group mb8 threshold-panel__gif">
          <label>Show themed gif</label>
          <small class="help-text">Comma separated <a href="https://gfycat.com" target="_blank">Gifycat</a> keywords</small>
          <input type="text" class="form-control" :value="thresholds[selectedIndex].gif" @change="$store.commit('setThresholdGif', {index: selectedIndex, value: $event.target.value})" placeholder="Leave empty = no gif">
        </div>
        <div class="form-group mb8 threshold-panel__colors">
          <label>Custom colors</label>
          <small class="help-text">Set buy & sell color</small>
          <div class="settings__column">
            <div class="form-group" title="When buy" v-tippy>
              <input type="text" class="form-control" :value="thresholds[selectedIndex].buyColor" :style="{ 'backgroundColor': thresholds[selectedIndex].buyColor }" @change="$store.commit('setThresholdColor', { index: selectedIndex, side: 'buyColor', value: $event.target.value })" @click="openPicker('buyColor', selectedIndex, $event)">
            </div>
            <div class="form-group" title="When sell" v-tippy>
              <input type="text" class="form-control" :value="thresholds[selectedIndex].sellColor" :style="{ 'backgroundColor': thresholds[selectedIndex].sellColor }" @change="$store.commit('setThresholdColor', { index: selectedIndex, side: 'buyColor', value: $event.target.value })" @click="openPicker('sellColor', selectedIndex, $event)">
            </div>
          </div>
        </div>
      </div>
    </div>
	</div>
</template>

<script>
import { mapState } from 'vuex';

import { Chrome } from 'vue-color'

export default {
  components: {
    'chrome-picker': Chrome
  },
	data() {
		return {
      picking: null,
      selectedIndex: null,
      selectedElement: null,
      selectedCaretPosition: 0
		}
	},
  computed: {
    ...mapState([
      'thresholds',
    ])
  },
  created() {
    this.onStoreMutation = this.$store.subscribe((mutation, state) => {
      switch (mutation.type) {
        case 'setThresholdAmount':
          this.refreshHandlers();
          break;
      }
    });
  },
  mounted() {
    this.refreshHandlers();

    this._doDrag = this.doDrag.bind(this);

    window.addEventListener('mousemove', this._doDrag, false);

    this._endDrag = this.endDrag.bind(this);

    window.addEventListener('mouseup', this._endDrag, false);

    this._doResize = this.refreshHandlers.bind(this);

    window.addEventListener('resize', this._doResize, false);
  },
  beforeDestroy() {
    window.removeEventListener('mousemove', this._doDrag);
    window.removeEventListener('mouseup', this._endDrag);
    window.removeEventListener('resize', this._doResize);

    this.onStoreMutation();
  },
	methods: {
    startDrag(event, index) {
      this.selectedIndex = index;

      if (index > 0) {
        this.selectedElement = event.target;
      }

      this.refreshCaretPosition(event.target);
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

      this.refreshCaretPosition();

      this.$store.commit('setThresholdAmount', {index: this.selectedIndex, value: this.$root.formatPrice(amount)});
    },
    endDrag(event) {
      if (this.selectedElement) {
        this.selectedElement = null;

        this.reorderThresholds();
      }

      if (this.picking) {
        this.closePicker(event);
      }
    },
    refreshHandlers() {
      const amounts = this.thresholds.map(threshold => threshold.amount);

      this.minimum = this.thresholds[0].amount;
      this.maximum = Math.max.apply(null, amounts);

      const bounds = this.$refs.thresholdContainer.getBoundingClientRect();

      this.offsetTop = bounds.top;
      this.offsetLeft = bounds.left;
      this.width = this.$refs.thresholdContainer.clientWidth;

      const handlers = this.$refs.thresholdContainer.children;

      const minLog = Math.log(this.minimum);
      const maxLog = Math.log(this.maximum) - minLog;

      for (let i = 1; i < this.thresholds.length; i++) {
        const handler = handlers[i];
        const threshold = this.thresholds[i];
        const posLog = Math.log(threshold.amount) - minLog;
        const posPx = this.width * (posLog / maxLog);

        handler.style.left = posPx + 'px';
      }
    },
    refreshCaretPosition(selectedElement = this.selectedElement) {
      const left = parseInt(selectedElement.style.left) || 0;

      this.selectedCaretPosition = Math.max(32, Math.min(this.width - 32, left));
    },
    reorderThresholds() {
      let selectedThreshold;

      if (this.selectedIndex !== null) {
        selectedThreshold = this.thresholds[this.selectedIndex];
      }

      const orderedThresholds = this.thresholds.sort((a, b) => a.amount - b.amount);

      this.$store.state.thresholds = orderedThresholds;

      this.$store.commit('setThresholdAmount', { index: 0, value: orderedThresholds[0].amount });

      if (selectedThreshold) {
        for (let i = 0; i < this.thresholds.length; i++) {
          if (selectedThreshold.amount === this.thresholds[i].amount && selectedThreshold.gif === this.thresholds[i].gif) {
            this.selectedIndex = i;
          }
        }
      }
    },
    openPicker(side, index, event) {
      if (!this.thresholds[index][side]) {
        this.$store.commit('setThresholdColor', { index: index, side: side, value: '#ffffff' });
      }

      this.picking = { side, index };

      setTimeout(() => {
        this.$refs.picker.$el.style.left = Math.min(this.width - this.$refs.picker.$el.clientWidth - 16, event.pageX - this.offsetLeft) + 'px';
        this.$refs.picker.$el.style.top = (event.pageY - this.offsetTop + 16) + 'px';
      })

      event.stopPropagation();
    },
    closePicker(event) {
      if (this.$refs.picker && this.$refs.picker.$el.contains(event.target)) {
        event.preventDefault();

        return;
      }

      this.picking = null;
    },
    updateColor(color) {
      if (!this.picking) {
        return;
      }

      this.$store.commit('setThresholdColor', { index: this.picking.index, side: this.picking.side, value: color.hex });
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

  &__bar {
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

    &.-selected {
      box-shadow: 0 0 0 10px rgba(white, .2);
    }
  }
}

.threshold-panel {
  position: relative;
  background-color: rgba(white, .2);
  border-radius: 2px;
  padding: 1em;
  margin: 2em 1em 1em;

  > .settings__column {
    @media screen and (max-width: 380px) {
      flex-direction: column;

      > .form-group {
        flex-basis: 100%;
        max-width: 100%;

        + .form-group {
          margin-top: 8px;
        }
      }
    }
  }

  code {
    color: white;
    font-weight: 600;
  }

  h3 {
    font-weight: 400;
    margin: 0 0 1em;
    color: rgba(white, .6);

    [contenteditable] {
      font-weight: 600;
      color: white;
      background-color: rgba(black, .2);
      padding: 0 .25em;
    }
  }

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

  &__caret {
    position: absolute;
    top: -.75em;
    border-left: .75em solid transparent;
    border-right: .75em solid transparent;
    border-bottom: .75em solid rgba(255, 255, 255, 0.2);
    margin-left: -1.75em;

    transition: left 1s $easeOutExpo;
  }

  &__colors {
    .form-control {
      height: auto;
      width: auto;
      min-width: 1px;
    }
  }

  &.-minimum {
    .threshold-panel__gif {
      opacity: .5;
      pointer-events: none;
    }
  }
}

@keyframes picker-in {
  from {
    opacity: 0;
    transform: translateY(-10%);
  }
  to {
    opacity: 1;
    transform: translateY(0%);
  }
}

.vc-chrome {
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 1;

  animation: .5s $easeOutExpo picker-in;
}
</style>
