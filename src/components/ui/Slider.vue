<template>
  <input type="range" :min="min" :max="max" :step="step" :value="value" />
</template>

<script>
export default {
  props: ['min', 'max', 'step', 'value'],

  mounted() {
    this._onMouseDownHandler = this.onMouseDown.bind(this)

    this.$el.addEventListener(
      this.$root.isTouchSupported ? 'touchstart' : 'mousedown',
      this._onMouseDownHandler,
      false
    )
  },

  beforeDestroy() {
    this.$el.removeEventListener(
      this.$root.isTouchSupported ? 'touchstart' : 'mousedown',
      this._onMouseDownHandler
    )
  },

  methods: {
    onMouseDown() {
      // handle double click
      clearTimeout(this._dblClickTimeout)
      if (this.pendingDblClick) {
        this.pendingDblClick = false
        this.$emit('reset')
        return
      }

      this._onMouseMoveHandler = this.onMouseMove.bind(this)
      document.addEventListener(
        this.$root.isTouchSupported ? 'touchmove' : 'mousemove',
        this._onMouseMoveHandler,
        false
      )

      this._onMouseUpHandler = this.onMouseUp.bind(this)
      document.addEventListener(
        this.$root.isTouchSupported ? 'touchend' : 'mouseup',
        this._onMouseUpHandler,
        false
      )

      // next click might be double click, for the next 300ms
      this.pendingDblClick = true
      this._dblClickTimeout = window.setTimeout(() => {
        this.pendingDblClick = false;
      }, 300);

      setTimeout(() => {
        this.$emit('output', this.$el.value);
      });
    },
    onMouseMove() {
      this.$emit('output', this.$el.value)
    },
    onMouseUp() {
      document.removeEventListener(
        this.$root.isTouchSupported ? 'touchmove' : 'mousemove',
        this._onMouseMoveHandler
      )
      document.removeEventListener(
        this.$root.isTouchSupported ? 'touchend' : 'mouseup',
        this._onMouseUpHandler
      )
    },
  },
}
</script>
