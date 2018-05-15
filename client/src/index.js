import Vue from 'vue'
import App from './App.vue'

import VueTippy from 'vue-tippy'

Vue.use(VueTippy, {
  maxWidth: '200px',
  duration: 200,
  arrow: false,
  animation: 'scale',
  size: 'small',
  delay: 0,
  animateFill: false,
  theme: 'blue'
});

Vue.component('editable', {
  template: `<div contenteditable="true" @input="$emit('update:content', $event.target.innerText)"></div>`,
  props: ['content'],
  mounted: function () {
    this.$el.innerText = this.content;
  },
  watch: {
    content: function () {
      if (this.$el.innerText !== this.content) {
        this.$el.innerText = this.content;
      }
    }
  }
});

new Vue({
  el: '#app',
  render: h => h(App)
})
