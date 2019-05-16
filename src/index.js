import Vue from 'vue'
import App from './App.vue'
import VueTippy from 'vue-tippy'

import store from './services/store'

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

import Editable from './components/ui/Editable'
import Dropdown from './components/ui/Dropdown'
import Slider from './components/ui/Slider'

Vue.component('dropdown', Dropdown);
Vue.component('editable', Editable);
Vue.component('slider', Slider);

new Vue({
	el: '#app',
	store,
	render: h => h(App),
	props: ['initialized'],
})
