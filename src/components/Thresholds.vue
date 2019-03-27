<template>
	<div class="thresholds">
    <chrome-picker v-if="picking !== null" ref="picker" :value="options.colors[picking.side][picking.index]" @input="updateColor"></chrome-picker>

    <p>Hide anything <strong>below</strong> <editable :content="minimum" @output="$store.commit('setMinimumAmount', $event)"></editable></p>
    <div class="thresholds__bar" ref="thresholdContainer">
      <div v-for="(threshold, index) in thresholds" :key="`threshold-${index}`" class="thresholds__handler" :class="{ '-selected': selectedIndex === index }" v-on:mousedown="startDrag($event, index)" :data-amount="$root.formatAmount(threshold.amount, 2)"></div>
    </div>
    <div class="threshold-panel" v-if="selectedIndex !== null">
      <div class="threshold-panel__caret" v-bind:style="{ left: this.selectedCaretPosition + 'px' }"></div>
      <a href="#" class="threshold-panel__close icon-cross" v-on:click="selectedIndex = null"></a>
      <h3>if amount > <strong>{{ $root.formatAmount(thresholds[selectedIndex].amount, 2) }}</strong></h3>
      <div class="settings__columns">
        <div class="form-group mb8">
          <label>Show themed gif</label>
          <small class="help-text">Comma separated <a href="https://gfycat.com" target="_blank">Gifycat</a> keywords</small>
          <input type="text" class="form-control" :value="thresholds[selectedIndex].gif" @change="$store.commit('setThresholdGif', {index: selectedIndex, value: $event.target.value})" placeholder="Leave empty = no gif">
        </div>
        <div class="form-group mb8 threshold-panel__colors">
          <label>Edit colors</label>
          <div class="settings__columns">
            <input type="text" class="form-control" :style="{ 'color': thresholds[selectedIndex].buyColor }" @click="openPicker('buy', 0, $event)">
            <input type="text" class="form-control" :style="{ 'backgroundColor': thresholds[selectedIndex].sellColor }" @click="openPicker('sell', 0, $event)">
          </div>
        </div>
      </div>
      <div class="form-group">
        <label>Change amount</label>
        <input type="text" class="form-control" :value="thresholds[selectedIndex].amount" @change="$store.commit('setThresholdAmount', {index: selectedIndex, value: $event.target.value})">
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
      'minimum',
      'thresholds',
    ])
  },
  created() {
    const amounts = this.thresholds.map(threshold => threshold.amount);

    this.maximum = Math.max.apply(null, amounts);

    this.onStoreMutation = this.$store.subscribe((mutation, state) => {
      switch (mutation.type) {
        case 'setMinimumAmount':
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

    this._doResize = this.refresh.bind(this);

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
      this.selectedElement = event.target;

      this.refreshCaretPosition();
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
      this.selectedElement = null;

      this.reorderThresholds();
    },
    refreshHandlers() {
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
    },
    refreshCaretPosition() {
      const left = parseInt(this.selectedElement.style.left);

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
    openPicker(side, index, $event) {
      this.picking = { side, index };

      setTimeout(() => {
        this.$refs.picker.$el.style.left = Math.min(window.innerWidth - this.$refs.picker.$el.clientWidth - 16, $event.target.offsetLeft) + 'px';
        this.$refs.picker.$el.style.top = ($event.pageY + 16) + 'px';
      })

      $event.stopPropagation();
    },
    closePicker($event) {
      if (this.$refs.picker && this.$refs.picker.$el.contains($event.target)) {
        $event.preventDefault();

        return;
      }

      this.picking = null;
    },
    updateColor() {
      if (!this.picking) {
        return;
      }

      Vue.set(options.colors[this.picking.side], this.picking.index, color.hex);

      options.onChange('colors', options.colors);
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

  code {
    color: white;
    font-weight: 600;
  }

  h3 {
    font-weight: 400;
    margin: 0 0 1em;
    color: rgba(white, .6);

    strong {
      text-transform: uppercase;
      color: white;
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
