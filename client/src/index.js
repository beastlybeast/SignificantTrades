import Vue from 'vue'
import App from './App.vue'

import VueTippy from 'vue-tippy'

Vue.use(VueTippy, {
  maxWidth: '200px',
  duration: 200,
  arrowType: 'shift-toward',
  animation: 'scale',
  size: 'small',
  delay: 0,
  animateFill: false,
  theme: 'blue'
})

new Vue({
  el: '#app',
  render: h => h(App)
})
