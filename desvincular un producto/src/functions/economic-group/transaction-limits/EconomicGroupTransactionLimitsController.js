"use strict";

const { BaseObject } = require("../../../commons/BaseObject"),
    { EconomicGroupTransactionLimitsDao } = require("./EconomicGroupTransactionLimitsDao"),
    { generateResponse, UNPROCESSABLE_ENTITY, GONE, NOT_FOUND, OK } = require("../../../commons/ResponseCreator"),
    StatusCodes = require("../../../commons/StatusCodes"),
    Constants = require("../../../commons/Constants"),
    LOGGER = require("@com-banistmo/scg-ms-logs-node"),
    { EconomicGroupTransactionLimitsService } = require("./EconomicGroupTransactionLimitsService"),
    { LimitsValidationsService } = require('../validations/LimitsValidationsService'),
    { Utils } = require("../../../commons/Utils");

class EconomicGroupTransactionLimitsController extends BaseObject {

    static async create(traceID) {
        let economicGroupTransactionLimitsController = new EconomicGroupTransactionLimitsController(traceID);
        await economicGroupTransactionLimitsController.initialize();
        return economicGroupTransactionLimitsController;
    }

    async initialize() {
        let economicGroupTransactionLimitsDao = new EconomicGroupTransactionLimitsDao(this.traceID);
        await economicGroupTransactionLimitsDao.initialize();
        this.economicGroupTransactionLimitsService = new EconomicGroupTransactionLimitsService(this.traceID, economicGroupTransactionLimitsDao);
        this.limitsValidationsService = new LimitsValidationsService(this.traceID, economicGroupTransactionLimitsDao);
    }

    async getEconomicGroupTransactionLimits(event) {
        let eventPathParameters = event.pathParameters;
        this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage("EGTLC000", "Buscando Limites Economicos del Grupo Economico",
            "ID::Channel", `${eventPathParameters.economicGroupID}::${eventPathParameters.channelID}`));
        let economicGroupTransactionLimits = await this.economicGroupTransactionLimitsService
            .getEconomicGroupTransactionLimits(decodeURIComponent(eventPathParameters.channelID), eventPathParameters.economicGroupID);
        return generateResponse(this.traceID, OK, StatusCodes.SUCCESSFUL_OPERATION, null, economicGroupTransactionLimits);
    }

    /**
     * APROBACION_GE
     * Consulta los límites de un GE en su versión actualizada
     * @param {Object} event
     */
    async getEconomicGroupTransactionLimitsTmp(event) {
        let eventPathParameters = event.pathParameters;
        this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage("EGTLC000", "Buscando Limites Economicos del Grupo Economico en su versión de actualización",
            "economicGroupID::channelID", `${eventPathParameters.economicGroupID}::${eventPathParameters.channelID}`));
        let economicGroupTransactionLimits = await this.economicGroupTransactionLimitsService
            .getEconomicGroupTransactionLimitsTmp(decodeURIComponent(eventPathParameters.channelID), eventPathParameters.economicGroupID);
        return generateResponse(this.traceID, OK, StatusCodes.SUCCESSFUL_OPERATION, null, economicGroupTransactionLimits);
    }

    async setEconomicGroupTransactionLimits(event) {
        let eventPathParameters = event.pathParameters,
            tokenInfo = Utils.getTokenInfoFromEvent(event),
            eventBody = JSON.parse(event.body);
        this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage("EGTLC001", "Estableciendo Limites Economicos del Grupo Economico",
            "ID::Channel", `${eventPathParameters.economicGroupID}::${eventPathParameters.channelID}`));

        await this.validateLimitsForEGCreation(eventBody, eventPathParameters.economicGroupID);

        await this.economicGroupTransactionLimitsService
            .setEconomicGroupTransactionLimits(
                decodeURIComponent(eventPathParameters.channelID),
                eventPathParameters.economicGroupID,
                eventBody.transaction_limits,
                tokenInfo.sub
            );
        return generateResponse(this.traceID, OK, StatusCodes.SUCCESSFUL_OPERATION);
    }

    async validateLimitsForEGCreation(eventBody, economicGroupID) {
        let transactionLimits = eventBody.transaction_limits
        let limitsFormated = []
        if (transactionLimits && Array.isArray(transactionLimits) && transactionLimits.length > 0) {
            transactionLimits.forEach((limit) => {
                limitsFormated.push({
                    "type": "transaction",
                    "transactionId": limit.id,
                    "transactionGroupChannelId": limit.transaction_group_channel_id,
                    "minValue": limit.transaction.bottom_limit,
                    "maxValue": limit.transaction.top_limit
                });

                limitsFormated.push({
                    "type": "daily",
                    "transactionId": limit.id,
                    "transactionGroupChannelId": limit.transaction_group_channel_id,
                    "minValue": limit.daily.bottom_limit,
                    "maxValue": limit.daily.top_limit
                });

                limitsFormated.push({
                    "type": "monthly",
                    "transactionId": limit.id,
                    "transactionGroupChannelId": limit.transaction_group_channel_id,
                    "minValue": limit.monthly.bottom_limit,
                    "maxValue": limit.monthly.top_limit
                });
            });
        }

        this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage('EGC009', 'Limites por validar', 'ID: ', limitsFormated));

        let limitsValidations = await this.limitsValidationsService.validations(limitsFormated, economicGroupID)
        if (limitsValidations && Array.isArray(limitsValidations) && limitsValidations.length > 0) {
            let responsePayload = {
                errors: {
                    limits: limitsValidations
                }
            }
            this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage('EGC009', 'Limites Validados', 'ID: ', responsePayload));
            throw generateResponse(this.traceID, UNPROCESSABLE_ENTITY, StatusCodes.ECONOMIC_GROUP_VALIDATION_ERROR, null, responsePayload);
        }
        return true;
    }

}

module.exports = {
    EconomicGroupTransactionLimitsController
};
