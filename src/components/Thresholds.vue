<template>
  <div class="thresholds" :class="{ '-dragging': dragging, '-rendering': rendering }">
    <verte
      v-if="picking !== null"
      :style="{ opacity: 0, position: 'absolute' }"
      display="widget"
      :draggable="true"
      ref="picker"
      picker="square"
      model="rgb"
      :colorHistory="colors"
      :value="thresholds[picking.index][picking.side]"
      @input="updateColor"
    ></verte>
    <table class="thresholds-table" v-if="showThresholdsAsTable">
      <tr v-for="(threshold, index) in thresholds" :key="`threshold-${index}`">
        <td class="thresholds-table__input">
          <input
            type="number"
            placeholder="Amount*"
            :value="thresholds[index].amount"
            @change="
              $store.commit('settings/SET_THRESHOLD_AMOUNT', {
                index: index,
                value: $event.target.value
              })
            "
          />
          <i class="icon icon-currency"></i>
        </td>
        <td class="thresholds-table__input">
          <input
            type="text"
            placeholder="Giphy"
            :value="thresholds[index].gif"
            @change="
              $store.commit('settings/SET_THRESHOLD_GIF', {
                index: index,
                value: $event.target.value
              })
            "
          />
        </td>
        <td
          class="thresholds-table__color"
          :style="{ backgroundColor: thresholds[index].buyColor }"
          @click="openPicker('buyColor', index, $event)"
        ></td>
        <td
          class="thresholds-table__color"
          :style="{ backgroundColor: thresholds[index].sellColor }"
          @click="openPicker('sellColor', index, $event)"
        ></td>
        <td class="thresholds-table__delete" @click="deleteThreshold(index)">
          <i class="icon-cross"></i>
        </td>
      </tr>
    </table>

    <div class="thresholds-slider" v-else>
      <div class="thresholds-gradients">
        <div class="thresholds-gradients__buys" ref="buysGradient"></div>
        <div class="thresholds-gradients__sells" ref="sellsGradient"></div>
      </div>

      <div class="thresholds-slider__bar" ref="thresholdContainer">
        <div
          v-for="(threshold, index) in thresholds"
          :key="`threshold-${index}`"
          class="thresholds-slider__handler"
          :class="{ '-selected': selectedIndex === index }"
          :data-amount="$root.formatAmount(threshold.amount, 2)"
        ></div>
      </div>
      <div
        class="threshold-panel"
        v-if="selectedIndex !== null"
        @click="editing = true"
        ref="thresholdPanel"
        :class="{ '-minimum': selectedIndex === 0 }"
        :style="{
          transform: 'translateX(' + this.panelOffsetPosition + 'px)'
        }"
      >
        <div
          class="threshold-panel__caret"
          :style="{
            transform: 'translateX(' + this.panelCaretPosition + 'px)'
          }"
        ></div>
        <a href="#" class="threshold-panel__close icon-cross" @click=";(selectedIndex = null), (editing = false), (picking = null)"></a>
        <h3>
          if amount >
          <editable
            :content="thresholds[selectedIndex].amount"
            @output="
              $store.commit('settings/SET_THRESHOLD_AMOUNT', {
                index: selectedIndex,
                value: $event
              })
            "
          ></editable>
        </h3>
        <div class="form-group mb8 threshold-panel__gif">
          <label>Show themed gif</label>
          <small class="help-text">
            Random gif based on
            <a href="https://gfycat.com" target="_blank">Gifycat</a>
            keyword
          </small>
          <input
            type="text"
            class="form-control"
            :value="thresholds[selectedIndex].gif"
            @change="
              $store.commit('settings/SET_THRESHOLD_GIF', {
                index: selectedIndex,
                value: $event.target.value
              })
            "
          />
        </div>
        <div class="form-group mb8 threshold-panel__colors">
          <label>Custom colors</label>
          <small class="help-text">Will show colored line</small>
          <div class="column">
            <div class="form-group" title="When buy" v-tippy="{ placement: 'bottom' }">
              <input
                type="text"
                class="form-control"
                :value="thresholds[selectedIndex].buyColor"
                :style="{ backgroundColor: thresholds[selectedIndex].buyColor }"
                @change="
                  $store.commit('settings/SET_THRESHOLD_COLOR', {
                    index: selectedIndex,
                    side: 'buyColor',
                    value: $event.target.value
                  })
                "
                @click="openPicker('buyColor', selectedIndex, $event)"
              />
            </div>
            <div class="form-group" title="When sell" v-tippy="{ placement: 'bottom' }">
              <input
                type="text"
                class="form-control"
                :value="thresholds[selectedIndex].sellColor"
                :style="{
                  backgroundColor: thresholds[selectedIndex].sellColor
                }"
                @change="
                  $store.commit('settings/SET_THRESHOLD_COLOR', {
                    index: selectedIndex,
                    side: 'sellColor',
                    value: $event.target.value
                  })
                "
                @click="openPicker('sellColor', selectedIndex, $event)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

import { TOUCH_SUPPORTED } from '../utils/constants'
import { formatPrice } from '../utils/helpers'
import { PALETTE } from '../utils/colors'

export default {
  data() {
    return {
      rendering: true,
      dragging: null,
      picking: null,
      editing: null,
      selectedIndex: null,
      selectedElement: null,
      panelCaretPosition: 0,
      panelOffsetPosition: 0
    }
  },

  computed: {
    ...mapState('settings', ['thresholds', 'showThresholdsAsTable', 'preferQuoteCurrencySize']),
    colors: () => PALETTE
  },

  created() {
    this.onStoreMutation = this.$store.subscribe(mutation => {
      switch (mutation.type) {
        case 'settings/TOGGLE_SETTINGS_PANEL':
        case 'settings/TOGGLE_THRESHOLDS_TABLE':
          if (this.picking) {
            this.closePicker(event)
          }

          if (
            (mutation.type === 'settings/TOGGLE_SETTINGS_PANEL' && mutation.payload === 'thresholds') ||
            (mutation.type === 'settings/TOGGLE_THRESHOLDS_TABLE' && mutation.payload === false)
          ) {
            this.rendering = true

            setTimeout(() => {
              this.refreshHandlers()
              this.refreshGradients()
            }, 100)
          }
          break
        case 'settings/SET_THRESHOLD_AMOUNT':
          this.reorderThresholds()
          this.refreshHandlers()
          break
        case 'settings/SET_THRESHOLD_COLOR':
          this.refreshGradients()
          break
        case 'settings/ADD_THRESHOLD':
          this.refreshHandlers()
          break
      }
    })
  },

  mounted() {
    if (!this.showThresholdsAsTable) {
      this.refreshHandlers()
      this.refreshGradients()
    }

    this._startDrag = this.startDrag.bind(this)

    this.$el.addEventListener(TOUCH_SUPPORTED ? 'touchstart' : 'mousedown', this._startDrag, false)

    this._doDrag = this.doDrag.bind(this)

    window.addEventListener(TOUCH_SUPPORTED ? 'touchmove' : 'mousemove', this._doDrag, false)

    this._endDrag = this.endDrag.bind(this)

    window.addEventListener(TOUCH_SUPPORTED ? 'touchend' : 'mouseup', this._endDrag, false)

    this._doResize = this.refreshHandlers.bind(this)

    window.addEventListener('resize', this._doResize, false)
  },

  beforeDestroy() {
    window.removeEventListener(TOUCH_SUPPORTED ? 'touchmove' : 'mousemove', this._doDrag)
    window.removeEventListener(TOUCH_SUPPORTED ? 'touchend' : 'mouseup', this._endDrag)
    window.removeEventListener('resize', this._doResize)

    this.onStoreMutation()
  },

  methods: {
    startDrag(event) {
      if (!event.target.classList.contains('thresholds-slider__handler')) {
        return
      }

      let x = event.pageX

      if (event.touches && event.touches.length) {
        x = event.touches[0].pageX
      }

      this.selectedIndex = Array.prototype.slice.call(event.target.parentNode.children).indexOf(event.target)

      if (this.selectedIndex > -1) {
        this.selectedElement = event.target
      }

      setTimeout(this.refreshCaretPosition.bind(this, event.target))

      this.dragStartedAt = {
        timestamp: +new Date(),
        position: x
      }
    },

    doDrag(event) {
      let x = event.pageX

      if (event.touches && event.touches.length) {
        x = event.touches[0].pageX
      }

      if (
        this.selectedElement === null ||
        !this.dragStartedAt ||
        (new Date() - this.dragStartedAt.timestamp < 1000 && Math.abs(this.dragStartedAt.position - x) < 3)
      ) {
        return
      }

      this.dragging = true

      const minLog = Math.max(0, Math.log(this.minimum + 1) || 0)
      const minLeft = (minLog / Math.log(this.maximum + 1)) * this.width

      let left = Math.max((this.width / 3) * -1, Math.min(this.width * 1.5, x - this.offsetLeft))
      let amount = Math.exp(((minLeft + (left / this.width) * (this.width - minLeft)) / this.width) * Math.log(this.maximum + 1)) - 1

      if (x < this.offsetLeft) {
        amount = this.thresholds[this.selectedIndex].amount - (this.thresholds[this.selectedIndex].amount - amount) * 0.1
        left = 0
      } else if (x > this.offsetLeft + this.width) {
        amount = this.thresholds[this.selectedIndex].amount - (this.thresholds[this.selectedIndex].amount - amount) * 0.1
        left = this.width
      }

      if (amount < 0) {
        amount = 0
      }

      this.selectedElement.style.transform = 'translateX(' + left + 'px)'

      this.refreshCaretPosition()

      this.thresholds[this.selectedIndex].amount = +formatPrice(amount)
    },

    endDrag(event) {
      if (this.selectedElement) {
        if (this.dragging) {
          this.$store.commit('settings/SET_THRESHOLD_AMOUNT', {
            index: this.selectedIndex,
            value: this.thresholds[this.selectedIndex].amount
          })
        }

        if (this.picking) {
          this.closePicker(event)
        }

        this.selectedElement = null

        this.reorderThresholds()
        this.refreshHandlers()
        this.refreshGradients()
      }

      this.dragging = false
    },

    refreshHandlers() {
      const amounts = this.thresholds.map(threshold => threshold.amount)

      this.minimum = this.thresholds[0].amount
      this.maximum = Math.max.apply(null, amounts)

      if (this.showThresholdsAsTable) {
        return
      }

      const bounds = this.$refs.thresholdContainer.getBoundingClientRect()

      this.offsetTop = bounds.top
      this.offsetLeft = bounds.left
      this.width = this.$refs.thresholdContainer.clientWidth

      const handlers = this.$refs.thresholdContainer.children

      const minLog = Math.max(0, Math.log(this.minimum + 1) || 0)
      const maxLog = Math.log(this.maximum + 1) - minLog

      for (let i = 0; i < this.thresholds.length; i++) {
        const handler = handlers[i]
        const threshold = this.thresholds[i]
        const posLog = Math.log(threshold.amount + 1) - minLog
        const posPx = this.width * (posLog / maxLog)

        handler.style.transform = 'translateX(' + posPx + 'px)'
      }

      this.rendering = false
    },

    refreshCaretPosition(selectedElement = this.selectedElement) {
      const left = parseFloat(selectedElement.style.transform.replace(/[^\d.]/g, '')) || 0
      const panelWidth = this.$refs.thresholdPanel.clientWidth
      const caretMargin = 12
      const panelRange = (this.width - panelWidth) / 2 + caretMargin

      this.panelOffsetPosition = -panelRange + panelRange * 2 * (left / this.width)
      this.panelCaretPosition = caretMargin + (panelWidth - caretMargin * 2) * (left / this.width)
    },

    refreshGradients() {
      if (this.showThresholdsAsTable) {
        return
      }

      const minLog = Math.max(0, Math.log(this.minimum + 1) || 0)
      const maxLog = Math.log(this.maximum + 1)

      let buysStops = []
      let sellsStops = []

      for (let i = 0; i < this.thresholds.length; i++) {
        const percent =
          i === 0
            ? 0
            : i === this.thresholds.length - 1
            ? 100
            : (((Math.log(this.thresholds[i].amount + 1) - minLog) / (maxLog - minLog)) * 100).toFixed(2)

        buysStops.push(`${this.thresholds[i].buyColor} ${percent}%`)
        sellsStops.push(`${this.thresholds[i].sellColor} ${percent}%`)
      }

      this.$refs.buysGradient.style.backgroundImage = `linear-gradient(to right, ${buysStops.join(', ')})`
      this.$refs.sellsGradient.style.backgroundImage = `linear-gradient(to right, ${sellsStops.join(', ')})`
    },

    reorderThresholds() {
      let selectedThreshold

      if (this.selectedIndex !== null) {
        selectedThreshold = this.thresholds[this.selectedIndex]
      }

      this.$store.state.thresholds = this.thresholds.sort((a, b) => a.amount - b.amount)

      if (selectedThreshold) {
        for (let i = 0; i < this.thresholds.length; i++) {
          if (selectedThreshold.amount === this.thresholds[i].amount && selectedThreshold.gif === this.thresholds[i].gif) {
            this.selectedIndex = i
          }
        }
      }
    },

    deleteThreshold(index) {
      if (this.thresholds.length <= 2) {
        return
      }

      this.$store.commit('settings/DELETE_THRESHOLD', index)
    },

    openPicker(side, index, event) {
      if (this.picking && this.picking.index === index && this.picking.side === side) {
        return this.closePicker(event)
      }

      if (!this.thresholds[index][side]) {
        this.$store.commit('settings/SET_THRESHOLD_COLOR', {
          index: index,
          side: side,
          value: '#ffffff'
        })
      }

      if (this.picking) {
        this.picking.target.classList.remove('-active')
      }

      this.picking = { side, index, target: event.target }

      this.picking.target.classList.add('-active')

      setTimeout(() => {
        const containerBounds = this.$el.getBoundingClientRect()
        const targetBounds = event.target.getBoundingClientRect()

        let left = Math.max(
          8,
          Math.min(
            this.$el.clientWidth - this.$refs.picker.$el.clientWidth - 8,
            targetBounds.left + targetBounds.width - containerBounds.left - this.$refs.picker.$el.clientWidth
          )
        )
        let top = targetBounds.top - containerBounds.top + event.target.clientHeight * 1.3

        this.$refs.picker.$el.style.top = top + 'px'
        this.$refs.picker.$el.style.left = left + 'px'
        this.$refs.picker.$el.style.position = 'absolute'
        this.$refs.picker.$el.style.opacity = 1
        this.$refs.picker.$el.style.zIndex = 10

        this.$refs.picker.fieldsIndex = 1
      }, 100)

      event.stopPropagation()

      if (!this._clickOutsideHandler) {
        this._clickOutsideHandler = (event => {
          if (!this.$refs.picker.$el.contains(event.target)) {
            this.closePicker()
          }
        }).bind(this)

        document.addEventListener('mousedown', this._clickOutsideHandler)
      }
    },

    closePicker() {
      if (this._clickOutsideHandler) {
        document.removeEventListener('mousedown', this._clickOutsideHandler)
        delete this._clickOutsideHandler
      }

      this.picking.target.classList.remove('-active')

      this.picking = null
    },

    updateColor(color) {
      if (!this.picking || this.thresholds[this.picking.index][`${this.picking.side}Color`] === color) {
        return
      }
      console.log(this.thresholds[this.picking.index][`${this.picking.side}Color`])
      this.$store.commit('settings/SET_THRESHOLD_COLOR', {
        index: this.picking.index,
        side: this.picking.side,
        value: color
      })
    }
  }
}
</script>

<style lang="scss">
.thresholds {
  position: relative;
  z-index: 1;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;

  &.-rendering .thresholds-slider {
    opacity: 0;

    &__handler {
      transform: scale(0.5) !important;
    }
  }

  .vc-chrome {
    position: absolute;
    z-index: 1;
    box-shadow: 0;
    display: flex;
    flex-direction: column;
    height: 250px;
    bottom: 0;
    flex-grow: 1;
    opacity: 0;
    transition: all 0.2s $easeOutExpo;

    .vc-chrome-fields .vc-input__label {
      font-family: monospace;
    }

    .vc-input__input {
      background: none;
      border: 1px solid white;
      border-radius: 2px;
      color: white;
      box-shadow: none;
    }

    .vc-chrome-body {
      border-radius: 0 0 2px 2px;
      background: lighten($dark, 18%) !important;
    }

    .vc-chrome-saturation-wrap {
      flex-grow: 1;
      padding: 0;
      border-radius: 2px 2px 0 0;
    }

    .vc-chrome-toggle-icon-highlight {
      background-color: rgba(black, 0.2);
    }

    .vc-chrome-toggle-icon {
      path {
        fill: white;
      }
    }

    &,
    .vc-chrome-body {
      box-shadow: none;
    }
  }

  &.-dragging {
    .thresholds-gradients,
    .thresholds-slider__handler {
      opacity: 0.5;

      &.-selected {
        opacity: 1;
      }
    }

    .thresholds-slider__handler {
      transition: box-shadow 0.2s $easeElastic;
    }

    .threshold-panel {
      transition: none;

      &__caret {
        transition: none;
      }
    }
  }
}

.thresholds-table {
  width: 100%;
  border: 0;
  border-spacing: 0px;
  padding: 0.5em 0 0.75em;

  &__input {
    position: relative;
    background-color: transparent;
    padding: 0.5em;

    i.icon {
      position: absolute;
      right: 7px;
      top: 7px;
    }

    input {
      width: 100%;
      border: 0;
      padding: 0;
      background: 0;
      color: white;

      &[type='number'] {
        font-weight: 600;
      }
    }

    + .thresholds-table__input {
      border-left: 1px solid rgba(white, 0.1);
      border-top: 1px solid rgba(white, 0.1);
    }
  }

  tr {
    &:first-child .thresholds-table__input {
      border-top: 0;
    }

    + tr .thresholds-table__input {
      border-left: 1px solid rgba(white, 0.1);
      border-top: 1px solid rgba(white, 0.1);

      &:first-child {
        border-left: 0;
      }
    }

    &:first-child {
      .thresholds-table__input:nth-child(2) {
        pointer-events: none;
        background-color: rgba(white, 0.05);
        cursor: not-allowed;
        border-left: 1px solid transparent;
      }
    }
  }

  tr:last-child .__input {
    border-bottom: 0;
  }

  &__color {
    width: 2em;
    transition: box-shadow 0.2s $easeOutExpo;
    cursor: pointer;

    &.-active {
      box-shadow: 0 0 0 0.5em rgba(white, 0.2);
      position: relative;
      z-index: 1;
    }
  }

  &__delete {
    cursor: pointer;
    padding: 0.5em 0 0.5em 0.5em;

    opacity: 0.5;

    &:hover {
      opacity: 1;
    }

    &.-disabled {
      opacity: 0.5;

      cursor: not-allowed;
    }
  }
}

.thresholds-slider {
  padding: 2em 0 1em;
  transition: opacity 0.2s $easeOutExpo;
  position: relative;

  &__bar {
    position: absolute;
    z-index: 1;

    padding: 2.75em 0 0;
    top: 0;
    left: 1em;
    right: 1em;
  }

  &__handler {
    position: absolute;
    width: 1em;
    height: 1em;
    background-color: white;
    margin-top: -0.5em;
    margin-left: -0.75em;
    padding: 0.25em;
    border-radius: 50%;
    transition: box-shadow 0.2s $easeElastic, transform 0.2s $easeOutExpo;
    box-shadow: 0 1px 0 1px rgba(black, 0.2);
    cursor: move;

    &:before {
      position: absolute;
      content: attr(data-amount);
      top: -2em;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.89em;
    }

    &.-selected {
      box-shadow: 0 1px 0 1px rgba(black, 0.2), 0 0 0 12px rgba(white, 0.2);
    }
  }
}

.thresholds-gradients {
  width: 100%;

  > div {
    height: 1em;
    width: 100%;
    border-radius: 0.75em 0.75em 0 0;

    + div {
      border-radius: 0 0 0.75em 0.75em;
    }
  }
}

.threshold-panel {
  position: relative;
  background-color: lighten($dark, 18%);
  border-radius: 4px;
  padding: 1em;
  margin: 1.5em auto 0;
  transition: transform 0.2s $easeOutExpo;
  max-width: 220px;

  .form-group {
    min-width: 1px;

    .form-control {
      background: none;
      border: 2px solid white;
      color: white;

      &::-webkit-input-placeholder {
        color: rgba(white, 0.55);
      }

      &:-moz-placeholder {
        /* Mozilla Firefox 4 to 18 */
        color: rgba(white, 0.55);
        opacity: 1;
      }

      &::-moz-placeholder {
        /* Mozilla Firefox 19+ */
        color: rgba(white, 0.55);
        opacity: 1;
      }

      &:-ms-input-placeholder {
        /* Internet Explorer 10-11 */
        color: rgba(white, 0.55);
      }

      &::-ms-input-placeholder {
        /* Microsoft Edge */
        color: rgba(white, 0.55);
      }

      &::placeholder {
        /* Most modern browsers support this now. */
        color: rgba(white, 0.55);
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
    color: rgba(white, 0.6);

    [contenteditable] {
      color: black;
      background-color: white;
      padding: 0.25em;
      border-radius: 1px;
      font-size: 0.75em;
      vertical-align: top;
      font-family: inherit;
    }
  }

  &__close {
    position: absolute;
    opacity: 0.5;
    right: 0;
    top: 0;
    padding: 1em;

    &:hover {
      opacity: 1;
    }
  }

  &__caret {
    position: absolute;
    top: -0.75em;
    border-left: 0.75em solid transparent;
    border-right: 0.75em solid transparent;
    border-bottom: 0.75em solid lighten($dark, 18%);
    margin-left: -1.75em;
    transition: transform 0.2s $easeOutExpo;
  }

  &__colors {
    .form-group .form-control {
      height: auto;
      width: auto;
      min-width: 1px;
      border: 0;
      font-family: monospace;
      letter-spacing: -0.1em;
      font-size: 0.9em;
      font-weight: 400;
      padding: 1.25em 1em;
    }
  }

  &.-minimum {
    &:before {
      content: 'Minimum for a trade to show up';
      display: block;
      margin-bottom: 1em;
      text-decoration: underline;
    }

    .threshold-panel__gif {
      display: none;
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
</style>
