import Vue from 'vue'
import App from './App.vue'
import VueTippy from 'vue-tippy'
import * as ModalDialogs from 'vue-modal-dialogs'
import Verte from 'verte';
import 'verte/dist/verte.css';

import store from './store'

Vue.use(ModalDialogs)

Vue.use(VueTippy, {
  maxWidth: '200px',
  duration: 200,
  arrow: false,
  animation: 'scale',
  size: 'small',
  delay: 0,
  animateFill: false,
  theme: 'blue'
})

Vue.component('verte', Verte);

import Editable from './components/ui/Editable'
import Dropdown from './components/ui/Dropdown'
import Slider from './components/ui/Slider'

Vue.component('dropdown', Dropdown)
Vue.component('editable', Editable)
Vue.component('slider', Slider)

new Vue({
  el: '#app',
  store,
  render: h => h(App),
  props: ['initialized']
})
