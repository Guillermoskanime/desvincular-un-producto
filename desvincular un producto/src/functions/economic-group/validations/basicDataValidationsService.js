'use strict';

const { BaseObject } = require('../../../commons/BaseObject'),
	{ generateResponse, INTERNAL_SERVER_ERROR } = require('../../../commons/ResponseCreator'),
	StatusCodes = require('../../../commons/StatusCodes'),
	{ Utils } = require('../../../commons/Utils'),
	LOGGER = require('@com-banistmo/scg-ms-logs-node');

class BasicDataValidationsService extends BaseObject {
	constructor(traceID, economicGroupDao) {
		super(traceID);
		this.economicGroupDao = economicGroupDao;
	}

	async validation(basicData, economicGroupId) {
		this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage('EGVB001', 'Inicio de validacíon de datos básicos', 'DATA: ', JSON.stringify(basicData)));
		let economicGroupCount, tmpEconomicGroupCount, DAOPromises = [], arrayError = [];
		try {
			DAOPromises.push(this.economicGroupDao.getEconomicGroupByName(basicData.name, economicGroupId));
			DAOPromises.push(this.economicGroupDao.getTempEconomicGroupByName(basicData.name, economicGroupId));
			let DAOpromisesResults = await Promise.all(DAOPromises);
			economicGroupCount = DAOpromisesResults[0];
			tmpEconomicGroupCount = DAOpromisesResults[1];
		} catch (error) {
			this.LOG.logging(
				LOGGER.LEVEL_ERROR,
				LOGGER.buildAnyMessage('EGVB002', 'Error Obteniendo el Grupo Economico', 'Error:', Utils.stringifyError(error))
			);
			throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_GET_ERROR);
		}
		if (economicGroupCount.count > 0 || tmpEconomicGroupCount.count > 0) {
			this.LOG.logging(
				LOGGER.LEVEL_ERROR,
				LOGGER.buildAnyMessage(
					'EGVB003',
					'Error El nombre del Grupo Económico ya existe',
					'Error:',
					'economicGroupCount: ' + JSON.stringify(economicGroupCount) + 'tmpEconomicGroupCount: ' + JSON.stringify(tmpEconomicGroupCount)
				)
			);
			let errorTmp = StatusCodes.DUPLICATED_ECONOMIC_GROUP_NAME;
			if(economicGroupId){
				errorTmp.detail = {economicGroupId: economicGroupId};
			}
			arrayError.push(errorTmp);
		}
		return arrayError;
	}
}

module.exports = {
	BasicDataValidationsService,
};
