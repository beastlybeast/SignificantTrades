<template>
  <svg class="measurement" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" @click="locked = !locked">
    <polygon ref="polygon" class="line" stroke-linejoin="round"></polygon>
  </svg>
</template>

<script>
export default {
  props: {
    maxPoints: {
      type: Number,
      default: 100
    },
    timeframe: {
      type: Number,
      default: 5000
    },
    debug: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      min: 0,
      max: 0,
      points: [],
      timestamp: 0
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      if (this.points.length < 2) {
        return
      }

      this.min = Math.min.apply(null, this.points)
      this.max = Math.max.apply(null, this.points)

      this.$refs.polygon.setAttribute('points', `0,${-this.min} ${this.points.map((p, i) => i + ',' + p * -1).join(' ')} ${this.points.length - 1},${-this.min}`)

      this.$el.setAttribute('viewBox', `0 ${-this.max} ${this.points.length - 1} ${this.max - this.min}`)
    },
    append(point) {
      const now = Math.floor(+new Date() / this.timeframe) * this.timeframe;

      if (!this.points.length || now > this.timestamp || (point < this.min || point > this.max)) {
        if (now > this.timestamp) {
          // add new point
          const length = this.points.push(point)

          if (length > this.maxPoints) {
            this.points.shift()
          }

          this.timestamp = now;
        } else {
          // update last point
          this.points[this.points.length - 1] = point;
        }

        // full render
        this.refresh()
      } else {
        const points = this.$refs.polygon.getAttribute('points');

        // update last point 'fast'
        this.points[this.points.length - 1] = point;
        this.$refs.polygon.setAttribute('points', points.replace(/\d+,[\d\-\.]+\ \d+,[\d\-\.]+$/, `${this.points.length - 1},${-point} ${this.points.length - 1},${-this.min}`));
      }
    },
    clear() {
      this.points = [];
      this.min = 0;
      this.max = 0;
      this.$refs.polygon.setAttribute('points', '');
    }
  }
}
</script>
