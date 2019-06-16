<template>
  <svg class="measurement" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
    <polygon ref="polygon" class="line" stroke-linejoin="round"></polygon>
  </svg>
</template>

<script>
export default {
  props: {
    maxPoints: {
      type: Number,
      default: 100
    }
  },
  data() {
    return {
      min: 0,
      max: 0,
      points: [],
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

      this.$refs.polygon.setAttribute('points', `0,${-this.min} ${this.points.map((p, i) => i + ',' + p * -1).join(' ')} ${this.points.length - 1},${-this.min} `)

      this.$el.setAttribute('viewBox', `0 ${-this.max} ${this.points.length - 1} ${this.max - this.min}`)
    },
    append(point) {
      const length = this.points.push(point)

      if (length > this.maxPoints) {
        this.points.shift()
      }

      this.refresh()
    }
  },
}
</script>
