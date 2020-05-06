<template>
  <div class="autocomplete">
    <div class="autocomplete__wrapper">
      <div class="autocomplete__items">
        <div class="autocomplete__item" v-for="(value, index) in items" :key="index" @click="removeItem(index)" v-text="value"></div>
        <div
          ref="input"
          class="autocomplete__input"
          contenteditable
          :placeholder="placeholder"
          @focus="open"
          @input="search($event.target.innerText)"
          @keydown="handleKeydown"
        ></div>
      </div>
      <button class="btn -blue autocomplete__submit" :class="{ active: items.length > 0 }" @click="submit"><i class="icon-check"></i></button>
    </div>
    <div class="autocomplete__dropdown" v-show="isOpen">
      <div
        class="autocomplete__option"
        v-for="(item, index) in availableOptions"
        :key="index"
        :class="{ active: activeOptionIndex === index }"
        @click="addItem(index)"
      >
        <slot :item="item">{{ item }}</slot>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    placeholder: {
      type: String,
      default: 'Type something...'
    },
    load: {
      type: Function
    },
    selected: {
      type: Array,
      default: new Array()
    }
  },
  data() {
    return {
      isOpen: false,
      activeOptionIndex: null,
      options: [],
      items: []
    }
  },
  computed: {
    availableOptions() {
      return this.options.filter(a => this.items.indexOf(a && typeof a === 'object' ? a.value : a) === -1)
    }
  },
  created() {
    this.items = this.selected.slice(0, this.selected.length)
  },
  mounted() {
    setTimeout(this.focus.bind(this))
  },
  methods: {
    search(query) {
      console.log('search', query)
      this.activeOptionIndex = null
      if (!this.load) {
        return
      }
      if (Array.isArray(this.load)) {
        this.options = this.load.filter(a => a.indexOf(query) !== -1)
      } else if (typeof this.load === 'function') {
        this.options = this.load(query)
      }
      if (!this.options) {
        this.options = []
      }
      this.options.splice(50, this.options.length)
      if (!this.options.length) {
        this.close()
      } else {
        this.activeOptionIndex = 0
        this.open()
      }
    },
    open() {
      if (this.isOpen || !this.options.length) {
        return
      }

      this.bindClickOutside()

      this.isOpen = true
    },
    close() {
      if (!this.isOpen) {
        return
      }

      this.unbindClickOutside()
      console.log('close')
      this.isOpen = false
    },
    addItem(index) {
      const item = this.availableOptions[index]
      const value = item && typeof item === 'object' ? item.value : item

      if (!value || this.items.indexOf(value) !== -1) {
        return
      }

      this.items.push(value)
      this.$refs.input.innerText = ''
      this.activeOptionIndex = null
    },
    removeItem(index) {
      this.items.splice(index, 1)
    },
    handleKeydown($event) {
      switch ($event.which) {
        case 13:
          event.preventDefault()
          if (this.activeOptionIndex !== null) {
            this.addItem(this.activeOptionIndex)
          } else if (this.items.length && !this.$refs.input.innerText.length) {
            this.submit()
          }
          break
        case 8:
          if (this.items.length && !this.$refs.input.innerText.length) {
            this.removeItem(this.items.length - 1)
            event.preventDefault()
          }
          break
        case 38:
        case 40:
          if (this.options.length) {
            if ($event.which === 38) {
              this.activeOptionIndex = Math.max(0, this.activeOptionIndex - 1)
            } else if ($event.which === 40) {
              if (this.activeOptionIndex === null) {
                this.activeOptionIndex = 0
              } else {
                this.activeOptionIndex = Math.min(this.availableOptions.length - 1, this.activeOptionIndex + 1)
              }
            }
          }
          break
      }
    },
    submit() {
      if (!this.items.length) {
        return
      }
      this.$emit('submit', this.items)
    },
    focus() {
      this.$refs.input.focus()
      if (typeof window.getSelection !== 'undefined' && typeof document.createRange != 'undefined') {
        var range = document.createRange()
        range.selectNodeContents(this.$refs.input)
        range.collapse(false)
        var sel = window.getSelection()
        sel.removeAllRanges()
        sel.addRange(range)
      } else if (typeof document.body.createTextRange != 'undefined') {
        var textRange = document.body.createTextRange()
        textRange.moveToElementText(this.$refs.input)
        textRange.collapse(false)
        textRange.select()
      }

      if (this.$refs.input.innerText.length) {
        this.search(this.$refs.input.innerText)
      }
    },
    bindClickOutside() {
      if (this._clickOutsideHandler) {
        return
      }

      this._clickOutsideHandler = (event => {
        if (this.$el !== event.target && !this.$el.contains(event.target)) {
          this.close()
        }
      }).bind(this)

      document.addEventListener('mousedown', this._clickOutsideHandler)
    },
    unbindClickOutside() {
      if (!this._clickOutsideHandler) {
        return
      }

      document.removeEventListener('mousedown', this._clickOutsideHandler)
      delete this._clickOutsideHandler
    }
  }
}
</script>
