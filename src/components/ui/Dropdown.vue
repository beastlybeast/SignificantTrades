<template>
  <div class="dropdown">
    <div
      class="dropdown__selected"
      @click="toggle"
      v-html="options[selected]"
    ></div>
    <div class="dropdown__options" v-show="isOpen">
      <div
        class="dropdown__option"
        v-for="(value, index) in options"
        :key="index"
        :class="{ active: index === selected }"
        @click="set(index)"
        v-html="value"
      ></div>
    </div>
  </div>
</template>

<script>
export default {
  props: ['options', 'selected'],

  data() {
    return {
      isOpen: false,
    }
  },

  created() {
    if (!this.selected) {
      this.selected = Object.keys(this.options)[0]
    }
  },

  methods: {
    toggle() {
      this.isOpen = !this.isOpen
    },

    show() {
      this.isOpen = true
    },

    hide() {
      this.isOpen = false
    },

    set(index) {
      this.selected = index
      this.$emit('output', index)
      this.hide()
    },
  },
}
</script>
