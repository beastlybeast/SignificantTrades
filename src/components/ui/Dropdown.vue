<template>
	<div class="dropdown">
		<div class="dropdown__selected" @click="toggle" v-html="options[selected]"></div>
		<div class="dropdown__options" v-show="isOpen">
			<div class="dropdown__option" v-for="(value, index) in options" v-bind:key="index" v-bind:class="{active: index === selected}" @click="set(index)" v-html="value"></div>
		</div>
	</div>
</template>

<script>

export default {
	props: ['options', 'selected'],

  data: function() {
    return {
      isOpen: false
    };
  },
	
	created() {
		if (!this.selected) {
			this.selected = Object.keys(this.options)[0];
		}
	},

  methods: {
    toggle: function() {
      this.isOpen = !this.isOpen;
    },
    show: function() {
      this.isOpen = true;
    },
    hide: function() {
      this.isOpen = false;
    },
    set: function(index) {
      this.selected = index;

      this.$emit('output', index);
      
      this.hide();
    }
  }
}

</script>