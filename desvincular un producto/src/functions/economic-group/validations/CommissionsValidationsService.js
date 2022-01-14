'use strict';

const { BaseObject } = require('../../../commons/BaseObject'),
	{ generateResponse, INTERNAL_SERVER_ERROR } = require('../../../commons/ResponseCreator'),
	StatusCodes = require('../../../commons/StatusCodes'),
	{ Utils } = require('../../../commons/Utils'),
	LOGGER = require('@com-banistmo/scg-ms-logs-node');
class CommissionsValidationsService extends BaseObject {
	constructor(traceID, economicGroupProductsDao) {
		super(traceID);
		this.economicGroupProductsDao = economicGroupProductsDao;
	}

	async validations(economicGroupId, commissions, products) {
		this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage('EGVC001', 'Inicio de validacíon de Comisiones', 'DATA: ', JSON.stringify(commissions)));
		let acctIds = [],
			arrayError = [];

		try {
			if (products && products.associated) {
				acctIds = products.associated.map(e => {
					return e.acctId;
				});
			}
			this.economicGroupProductsDao.initialize();
			let economicGroupProducts = await this.economicGroupProductsDao.getEconomicGroupProducts(economicGroupId);
			let acctIdsTmp = economicGroupProducts.rows.map(e => {
				return e.productNumber;
			});
			acctIds = [...acctIds, ...acctIdsTmp];
		} catch (error) {
			this.LOG.logging(
				LOGGER.LEVEL_ERROR,
				LOGGER.buildAnyMessage('EGVC001', 'Error Obteniendo los productos del grupo Economico', 'Error:', Utils.stringifyError(error))
			);
			throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_PRODUCT_GET_ERROR);
		}
		for (let i = 0; i < commissions.length; i++) {
			if (acctIds.indexOf(commissions[i].chargeAccount) < 0) {
				this.LOG.logging(
					LOGGER.LEVEL_ERROR,
					LOGGER.buildAnyMessage(
						StatusCodes.VALIDATE_EG_COMMISSIONS_MAIN_ACCOUNT_DOESNT_BELONG.code,
						'Error la cuenta de cobro principal no pertenece al Grupo Economico',
						'Error:',
						'chargeAccount: ' + JSON.stringify(commissions[i].chargeAccount)
					)
				);
				let errorTmp = StatusCodes.VALIDATE_EG_COMMISSIONS_MAIN_ACCOUNT_DOESNT_BELONG;
				errorTmp.detail = commissions[i];
				arrayError = [...arrayError, ...[Object.assign({}, errorTmp)]];
			}
			if (commissions[i].chargeAccountBackup) {
				if (acctIds.indexOf(commissions[i].chargeAccountBackup) < 0) {
					this.LOG.logging(
						LOGGER.LEVEL_ERROR,
						LOGGER.buildAnyMessage(
							StatusCodes.VALIDATE_EG_COMMISSIONS_BACKUP_ACCOUNT_DOESNT_BELONG.code,
							'Error La cuenta de cobro de backup no pertenece al Grupo Economico',
							'Error:',
							'chargeAccountBackup: ' + JSON.stringify(commissions[i].chargeAccountBackup)
						)
					);
					let errorTmp = StatusCodes.VALIDATE_EG_COMMISSIONS_BACKUP_ACCOUNT_DOESNT_BELONG;
					errorTmp.detail = commissions[i];
					arrayError = [...arrayError, ...[Object.assign({}, errorTmp)]];
				}
			}
		}
		return arrayError;
	}
}

module.exports = {
	CommissionsValidationsService,
};
