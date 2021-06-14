<template>
  <div :class="'notice -' + notice.type">
    <span class="notice__icon icon-"></span>
    <div class="notice__title">{{ notice.title }}</div>
    <div v-if="notice.message" class="notice__message" v-html="notice.message"></div>
  </div>
</template>

<script>
export default {
  props: ['notice'],
  data() {
    return {}
  },
  mounted() {
    this._onClick = this.click.bind(this)

    this.$el.addEventListener('click', this._onClick)
  },
  beforeDestroy() {
    this.$el.removeEventListener('click', this._onClick)
  },
  methods: {
    click() {
      if (this.notice.click) {
        this.notice.click(this)
      } else {
        this.hide()
      }
    },
    hide() {
      this.$store.dispatch('app/hideNotice', this.notice.id)
    }
  }
}
</script>
