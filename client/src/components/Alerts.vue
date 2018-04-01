<template>
	<div class="alerts">
		<div v-for="(alert, index) in alerts" class="alert" :key="alert.id" :class="'alert--' + alert.type" v-on:click="dismiss(index)">
			<span class="alert__icon icon-"></span>
			<div class="alert__title">{{ alert.title }}</div>
			<div v-if="alert.message" class="alert__message">{{ alert.message }}</div>
		</div>
	</div>
</template>

<script>
  import options from '../services/options';
  import socket from '../services/socket';

  export default {
    data() {
      return {
				alerts: []
      }
    },
    created() {
      socket.$on('alert', alert => {
				if (alert.data) {
					if (alert.data.type === 'connected' || alert.data.type === 'disconnected') {
						for (let _alert of this.alerts) {
							if (_alert.data && _alert.data.exchange === alert.data.exchange && _alert.data.type != alert.data.type) {
								this.alerts.splice(this.alerts.indexOf(_alert), 1);
								break;
							}
						}
					}
				}

				if (!alert.title) {
					alert.title = alert.message;

					delete alert.message;
				}

				if (!alert.title && !alert.message) {
					return;
				}

				alert.id = Math.random().toString(36).substring(7);

				this.alerts.push(alert);
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

		> .alert__message {
			flex-basis: 100%;
			font-size: 70%;
			margin: 5px 0 0;
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
				content: unicode($icon-times);
			}
		}

		&.alert--warning {
			background-color: $yellow;

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
	}
</style>
