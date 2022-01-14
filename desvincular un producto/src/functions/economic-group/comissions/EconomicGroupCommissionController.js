"use strict";

const { BaseObject } = require("../../../commons/BaseObject"),
  { generateResponse, CREATED, GONE, UNPROCESSABLE_ENTITY, OK } = require("../../../commons/ResponseCreator"),
  StatusCodes = require("../../../commons/StatusCodes"),
  { EconomicGroupCommissionService } = require("./EconomicGroupCommissionService"),
  { CommissionsValidationsService } = require("../validations/CommissionsValidationsService"),
  { EconomicGroupCommissionDao } = require("./EconomicGroupCommissionDao"),
  { EconomicGroupProductsDao } = require("../products/EconomicGroupProductsDao"),
  Constants = require("../../../commons/Constants"),
  LOGGER = require("@com-banistmo/scg-ms-logs-node"),
  { Utils } = require("../../../commons/Utils");

class EconomicGroupCommissionController extends BaseObject {
  static async create(traceID) {
    let economicGroupCommissionController = new EconomicGroupCommissionController(traceID);
    await economicGroupCommissionController.initialize();
    return economicGroupCommissionController;
  }

  async initialize() {
    //Inicialización de DAOs
    let economicGroupCommissionDao = new EconomicGroupCommissionDao(this.traceID);
    await economicGroupCommissionDao.initialize();
    let economicGroupProductsDao = new EconomicGroupProductsDao(this.traceID);
    await economicGroupProductsDao.initialize();

    //Inicialización de servicios
    this.economicGroupCommissionService = new EconomicGroupCommissionService(this.traceID, economicGroupCommissionDao);
    this.commissionsValidationsService = new CommissionsValidationsService(this.traceID, economicGroupProductsDao);
  }

  async getEconomicGroupCommissionDetail(event) {
    let eventPathParameters = event.pathParameters;
    this.LOG.logging(
      LOGGER.LEVEL_INFO,
      LOGGER.buildAnyMessage("EGCC000", "Buscando Comisiones del Grupo Economico", "ID:", eventPathParameters.economicGroupID)
    );
    let economicGroupCommissions = await this.economicGroupCommissionService.getEconomicGroupCommissionDetail(eventPathParameters.economicGroupID, event);
    return generateResponse(this.traceID, OK, StatusCodes.SUCCESSFUL_OPERATION, null, economicGroupCommissions);
  }

  //APROBACION_GE
  async getEconomicGroupCommissionDetailTmp(event) {
    let eventPathParameters = event.pathParameters;
    this.LOG.logging(
      LOGGER.LEVEL_INFO,
      LOGGER.buildAnyMessage("EGCC100", "Buscando Comisiones del Grupo Economico en version Tmp", "ID:", eventPathParameters.economicGroupID)
    );
    let economicGroupCommissions = await this.economicGroupCommissionService.getEconomicGroupCommissionDetailTmp(eventPathParameters.economicGroupID);
    return generateResponse(this.traceID, OK, StatusCodes.SUCCESSFUL_OPERATION, null, economicGroupCommissions);
  }

  async setEconomicGroupCommissions(event) {
    let eventPathParameters = event.pathParameters,
      tokenData = Utils.getTokenInfoFromEvent(event),
      eventBody = JSON.parse(event.body);

    let commissionsFormated = eventBody.commissions.map(c => {
      return {
        name: c.service_name,
        discount: c.discount,
        exonerationPeriod: c.exoneration_periods,
        chargeAccount: c.commission_account,
        chargeAccountBackup: c.commission_backup_account
      };
    });
    let commissionsValidations = await this.commissionsValidationsService.validations(eventPathParameters.economicGroupID, commissionsFormated, null);
    if (commissionsValidations && Array.isArray(commissionsValidations) && commissionsValidations.length > 0) {
      let responsePayload = {
        errors: {
          commissions: commissionsValidations
        }
      };
      this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage("EGC009", "Comisiones del Grupo Economico Validadas", "ID: ", responsePayload));
      throw generateResponse(this.traceID, UNPROCESSABLE_ENTITY, StatusCodes.ECONOMIC_GROUP_VALIDATION_ERROR, null, responsePayload);
    }

    this.LOG.logging(
      LOGGER.LEVEL_INFO,
      LOGGER.buildAnyMessage(
        "EGCC001",
        "Estableciendo Comisiones del Grupo Economico",
        "ID::Commissions",
        `${eventPathParameters.economicGroupID}::${eventBody.commissions}`
      )
    );
    await this.economicGroupCommissionService.setEconomicGroupCommissions(eventPathParameters.economicGroupID, eventBody.commissions, tokenData.sub);
    return generateResponse(this.traceID, CREATED, StatusCodes.SUCCESSFUL_OPERATION);
  }
}

module.exports = {
  EconomicGroupCommissionController
};
