<template>
	<div class="alerts">
		<div v-for="(alert, index) in alerts" class="alert" :key="alert.id" :class="'alert--' + alert.type" v-on:click="dismiss(index)">
			<font-awesome-icon class="alert__icon" :icon="alert.icon" />
			<div class="alert__title">{{ alert.title }}</div>
			<div v-if="alert.message" class="alert__message">{{ alert.message }}</div>
		</div>
	</div>
</template>

<script>
  import FontAwesomeIcon from '@fortawesome/vue-fontawesome';
  import exclamationTriangle from '@fortawesome/fontawesome-free-solid/faExclamationTriangle';
  import infoCircle from '@fortawesome/fontawesome-free-solid/faInfoCircle';
  import exclamationCircle from '@fortawesome/fontawesome-free-solid/faExclamationCircle';
  import check from '@fortawesome/fontawesome-free-solid/faCheck';

  import options from '../services/options';
  import socket from '../services/socket';

  export default {
    components: {
      FontAwesomeIcon
    },
    data() {
      return {
        warningIcon: exclamationTriangle,
        errorIcon: exclamationCircle,
        infoIcon: infoCircle,
        successIcon: check,
				alerts: []
      }
    },
    created() {
      socket.$on('alert', alert => {
				if (!alert.title) {
					alert.title = alert.message;

					delete alert.message;
				}

				if (!alert.title && !alert.message) {
					return;
				}

				alert.icon = this[alert.type + 'Icon'];

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
	@import '../assets/variables';

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
		}

		&.alert--warning {
			background-color: $yellow;
		}

		&.alert--success {
			background-color: $green;
		}

		&.alert--info {
			background-color: $blue;
		}
	}
</style>
