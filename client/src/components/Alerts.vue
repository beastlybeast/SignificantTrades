<template>
	<div class="alerts">
		<div v-for="(alert, index) in alerts" class="alert" :key="alert.id" :class="alert.classname" v-on:click="alert.click ? alert.click(alert) && dismiss(index) : dismiss(index)">
			<span class="alert__icon icon-"></span>
			<div class="alert__title">{{ alert.title }}</div>
			<div v-if="alert.message" class="alert__message" v-html="alert.message"></div>
		</div>
	</div>
</template>

<script>
  import options from '../services/options'
  import socket from '../services/socket'

  export default {
    data() {
      return {
				alerts: []
      }
    },
    created() {
      socket.$on('alert', alert => {
				if (!alert || typeof alert !== 'object') {
					let index = 0;
					let length = this.alerts.length;

					if (typeof alert === 'string') {
						for (let i = 0; i < this.alerts.length; i++) {
							if (this.alerts[i].id === alert) {
								clearTimeout(alert.hideTimeout);
								index = i;
								length = 1;
								break;
							}
						}
					}
					
					this.alerts.splice(0, this.alerts.length);
					return;
				}

				if (alert.id) {
					for (let _alert of this.alerts) {
						if (_alert.id === alert.id) {
							this.alerts.splice(this.alerts.indexOf(_alert), 1);

							break;
						}
					}
				} else {
					alert.id = Math.random().toString(36).substring(7);
				}

				alert.timestamp = +new Date();

				if (!alert.title) {
					alert.title = alert.message;

					delete alert.message;
				}

				if (!alert.title && !alert.message) {
					return;
				}

				if (typeof alert.classname === 'undefined') {
					alert.classname = '';
				}

				if (alert.type) {
					alert.classname += ' alert--' + alert.type;
				}

				this.alerts.push(alert);

				if (alert.type !== 'error') {
					alert.hideTimeout = setTimeout(() => {
						this.dismiss(this.alerts.indexOf(alert));
					}, 1000 * 30);
				}
      });
    },
    methods: {
      dismiss(index) {
				this.alerts.splice(index, 1);
      }
    }
  }
</script>

<style lang="scss">
	@import '../assets/sass/variables';

	.alert {
		display: flex;
		color: white;
		cursor: pointer;
		flex-wrap: wrap;
		padding: 8px 10px;
		align-items: center;

		> .alert__message {
			flex-basis: 100%;
			font-size: 70%;
			margin: 5px 0 0;

			a {
				color: rgba(white, .8);
				text-decoration: underline;

				&:hover {
					color: white;
				}
			}
		}

		> .alert__title {
			flex-grow: 1;
		}

		> .alert__icon {
			flex-basis: auto;
			margin-right: 5px;
			font-size: 18px;
		}

		&.alert--error {
			background-color: $red;

			.alert__icon:before {
				content: unicode($icon-cross);
			}
		}

		&.alert--warning {
			background-color: $orange - 40%;

			.alert__icon:before {
				content: unicode($icon-warning);
			}
		}

		&.alert--success {
			background-color: $green;

			.alert__icon:before {
				content: unicode($icon-check);
			}
		}

		&.alert--info {
			background-color: $blue;

			.alert__icon:before {
				content: unicode($icon-info);
			}
		}

		&.alert--notice {
			.alert__title {
				font-size: 14px;
			}

			.alert-message {
				font-size: 12px;
			}
		}
	}
</style>
