<template>
  <div contenteditable="true" @keydown="onKeyDown" @input="changed = true" @focus="onFocus" @blur="onBlur" @click="onClick"></div>
</template>

<script>
export default {
  props: ['content'],
  data() {
    return {
      changed: false
    }
  },
  mounted: function() {
    this.$el.innerText = this.content
  },
  watch: {
    content: function() {
      if (this.$el.innerText !== this.content) {
        this.$el.innerText = this.content
      }
    }
  },
  methods: {
    selectAll() {
      window.setTimeout(() => {
        var sel, range
        if (window.getSelection && document.createRange) {
          range = document.createRange()
          range.selectNodeContents(this.$el)
          sel = window.getSelection()
          sel.removeAllRanges()
          sel.addRange(range)
        } else if (document.body.createTextRange) {
          range = document.body.createTextRange()
          range.moveToElementText(this.$el)
          range.select()
        }
      }, 1)
    },
    onBlur($event) {
      if ($event.which === 13) {
        event.preventDefault()
        return
      }

      this.changed && this.$emit('output', $event.target.innerText)
      this.focused = false

      if (window.getSelection) {
        window.getSelection().removeAllRanges()
      } else if (document.selection) {
        document.selection.empty()
      }
    },
    onKeyDown($event) {
      if ($event.which === 13) {
        event.preventDefault()

        this.$el.blur()

        return
      }

      if (!isNaN($event.target.innerText)) {
        if ($event.which === 38) {
          this.$emit('output', +$event.target.innerText + 1)
        } else if ($event.which === 40) {
          this.$emit('output', +$event.target.innerText - 1)
        }
      }
    },
    onFocus() {
      !this.focused && this.selectAll()

      this.changed = false
      this.focused = true
    },
    onClick() {
      const now = +new Date()

      if (this.clickAt && now - this.clickAt < 250) {
        this.selectAll()
      }

      this.clickAt = now
    }
  }
}
</script>
