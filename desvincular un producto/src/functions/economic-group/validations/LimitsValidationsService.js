'use strict';

const { BaseObject } = require('../../../commons/BaseObject'),
	{ generateResponse, INTERNAL_SERVER_ERROR } = require('../../../commons/ResponseCreator'),
	StatusCodes = require('../../../commons/StatusCodes'),
	{ Utils } = require('../../../commons/Utils'),
	Constants = require('../../../commons/Constants'),
	LOGGER = require('@com-banistmo/scg-ms-logs-node'),
	{ EconomicGroupTransactionLimitsDao } = require('../transaction-limits/EconomicGroupTransactionLimitsDao');

class LimitsValidationsService extends BaseObject {
	constructor(traceID, economicGroupTransactionLimitsDao) {
		super(traceID);
		this.economicGroupTransactionLimitsDao = economicGroupTransactionLimitsDao;
	}

	async validations(limits, economicGroupId) {
		this.LOG.logging(
			LOGGER.LEVEL_INFO,
			LOGGER.buildAnyMessage('EGVL001', 'Inicio de validacíon de Limites', 'DATA: ', JSON.stringify(limits))
		);
		let channelLimits,
			limitsDB,
			validateIdsLimits = false,
			channelLimitsMap = [],
			limitsIds = [],
			limitsDaily = [],
			limitsMonthly = [],
			limitsTransaction = [],
			arrayError = [];
		limits.forEach(limit => {
			if (limit.limitId && limitsIds.indexOf(limit.limitId) < 0) {
				validateIdsLimits = true;
				limitsIds.push(limit.limitId);
			}
			switch (limit.type) {
				case Constants.LIMITS_TYPE.TRANSACTION:
					limitsTransaction[limit.transactionGroupChannelId] = limit;
					break;
				case Constants.LIMITS_TYPE.DAILY:
					limitsDaily[limit.transactionGroupChannelId] = limit;
					break;
				case Constants.LIMITS_TYPE.MONTHLY:
					limitsMonthly[limit.transactionGroupChannelId] = limit;
					break;
				default:
					break;
			}
		});
		try {
			this.economicGroupTransactionLimitsDao.initialize();
			channelLimits = await this.economicGroupTransactionLimitsDao.getTransactionLimitsByChannel(Constants.GENERAL.CHANNEL_LIMITS);
			limitsDB = await this.economicGroupTransactionLimitsDao.getLimitsEconomicGroup(economicGroupId, limitsIds);
		} catch (error) {
			this.LOG.logging(
				LOGGER.LEVEL_ERROR,
				LOGGER.buildAnyMessage('EGVL002', 'Error Obteniendo los limites del canal', 'Error:', Utils.stringifyError(error))
			);
			throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_TRANSACTION_LIMITS_GET_ERROR);
		}
		if (validateIdsLimits && limitsDB.count !== limitsIds.length) {
			this.LOG.logging(
				LOGGER.LEVEL_ERROR,
				LOGGER.buildAnyMessage(
					'EGVL003',
					'Error los limites obteniendo son diferentes a los limites del grupo económico',
					'Error:',
					JSON.stringify(limitsDB)
				)
			);
			throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_TRANSACTION_LIMITS_GET_ERROR);
		}

		channelLimits.forEach(d => {
			channelLimitsMap[d.transaction_group_channel_id] = d;
		});

		limitsTransaction.forEach(limit => {
			if (limit.maxValue > parseFloat(channelLimitsMap[limit.transactionGroupChannelId].topLimit)) {
				this.LOG.logging(
					LOGGER.LEVEL_ERROR,
					LOGGER.buildAnyMessage(
						StatusCodes.VALIDATE_LIMITS_EG_TRANSACTION_LIMIT_EXCEEDS_CHANNEL_LIMIT.code,
						'Error, alguno de los limites por transacción supera al limite transaccional del canal',
						'Error:',
						limit.maxValue + ' supera a ' + channelLimitsMap[limit.transactionGroupChannelId].topLimit
					)
				);
				let errorTmp = StatusCodes.VALIDATE_LIMITS_EG_TRANSACTION_LIMIT_EXCEEDS_CHANNEL_LIMIT;
				errorTmp.detail = {
					type: limit.type,
					transactionGroupChannelId: limit.transactionGroupChannelId,
				};
				arrayError = [...arrayError, ...[Object.assign({}, errorTmp)]];
			}
		});

		limitsDaily.forEach(limit => {
			if (limit.maxValue > limitsMonthly[limit.transactionGroupChannelId].maxValue) {
				this.LOG.logging(
					LOGGER.LEVEL_ERROR,
					LOGGER.buildAnyMessage(
						StatusCodes.VALIDATE_LIMITS_EG_DAILY_LIMIT_GREATER_THAN_MONTHLY.code,
						'Error, alguno de los limites diario supera al limite mensuaal',
						'Error:',
						limit.maxValue + ' supera a ' + limitsMonthly[limit.transactionGroupChannelId].maxValue
					)
				);
				let errorTmp = StatusCodes.VALIDATE_LIMITS_EG_DAILY_LIMIT_GREATER_THAN_MONTHLY;
				errorTmp.detail = {
					type: limit.type,
					transactionGroupChannelId: limit.transactionGroupChannelId,
				};
				arrayError = [...arrayError, ...[Object.assign({}, errorTmp)]];
			}
		});
		return arrayError;
	}
}

module.exports = {
	LimitsValidationsService,
};
