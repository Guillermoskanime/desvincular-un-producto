"use strict";

const { BaseObject } = require("../../../commons/BaseObject"),
  { EconomicGroupProductsDao } = require("./EconomicGroupProductsDao"),
  { generateResponse, CREATED, GONE, ACCEPTED, OK } = require("../../../commons/ResponseCreator"),
  StatusCodes = require("../../../commons/StatusCodes"),
  Constants = require("../../../commons/Constants"),
  LOGGER = require("@com-banistmo/scg-ms-logs-node"),
  { EconomicGroupProductsService } = require("./EconomicGroupProductsService"),
  { EnterpriseProductsService } = require("../../enterprise/products/EnterpriseProductsService"),
  { Utils } = require("../../../commons/Utils");

class EconomicGroupProductsController extends BaseObject {
  static async create(traceID) {
    let economicGroupProductsController = new EconomicGroupProductsController(traceID);
    await economicGroupProductsController.initialize();
    return economicGroupProductsController;
  }

  async initialize() {
    let economicGroupProductsDao = new EconomicGroupProductsDao(this.traceID);
    this.economicGroupProductsService = new EconomicGroupProductsService(this.traceID, economicGroupProductsDao);
    this.enterpriseProductsService = new EnterpriseProductsService(this.traceID, economicGroupProductsDao);
  }

  async getEconomicGroupEnterprisesDetail(event) {
    let userToken = Utils.getTokenFromEvent(event),
      eventPathParameters = event.pathParameters,
      eventQueryString = event.queryStringParameters || {};
    this.LOG.logging(
      LOGGER.LEVEL_INFO,
      LOGGER.buildAnyMessage("EGPC000", "Buscando Empresas del Grupo Economico", "ID:", eventPathParameters.economicGroupID)
    );
    let economicGroupEnterprises = await this.economicGroupProductsService.getEconomicGroupEnterprisesDetail(
      userToken,
      eventPathParameters.economicGroupID,
      eventQueryString.offset,
      eventQueryString.limit
    );

    return generateResponse(
      this.traceID,
      OK,
      StatusCodes.SUCCESSFUL_OPERATION,
      null,
      Utils.generatePaginatedResponse(eventQueryString.offset, eventQueryString.limit, economicGroupEnterprises.count, economicGroupEnterprises.rows)
    );
  }

  /**
   * APROBACION_GE
   * Busca la version en tablas temporales o inactivas de las empresas de un GE
   * @param {*} event
   */
  async getEconomicGroupEnterprisesDetailTmp(event) {
    let userToken = Utils.getTokenFromEvent(event),
      eventPathParameters = event.pathParameters,
      eventQueryString = event.queryStringParameters || {};
    this.LOG.logging(
      LOGGER.LEVEL_INFO,
      LOGGER.buildAnyMessage("EGPC100", "Buscando Empresas del Grupo Economico en actualziacion", "ID:", eventPathParameters.economicGroupID)
    );
    let economicGroupEnterprises = await this.economicGroupProductsService.getEconomicGroupEnterprisesDetailTmp(
      userToken,
      eventPathParameters.economicGroupID,
      eventQueryString.offset,
      eventQueryString.limit
    );

    return generateResponse(
      this.traceID,
      OK,
      StatusCodes.SUCCESSFUL_OPERATION,
      null,
      Utils.generatePaginatedResponse(eventQueryString.offset, eventQueryString.limit, economicGroupEnterprises.count, economicGroupEnterprises.rows)
    );
  }

  async getEconomicGroupEnterprisesDetailByUser(event) {
    let userToken = Utils.getTokenFromEvent(event),
      eventQueryString = event.queryStringParameters || {};
    this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage("EGPC007", "Buscando Empresas del Grupo Economico Para Usuario"));
    let economicGroupEnterprises = await this.economicGroupProductsService.getEconomicGroupEnterprisesDetailByUser(
      userToken,
      eventQueryString.offset,
      eventQueryString.limit
    );

    return generateResponse(
      this.traceID,
      OK,
      StatusCodes.SUCCESSFUL_OPERATION,
      null,
      Utils.generatePaginatedResponse(eventQueryString.offset, eventQueryString.limit, economicGroupEnterprises.count, economicGroupEnterprises.rows)
    );
  }

  async economicGroupEnterprisesProductsDetail(event) {
    let userToken = Utils.getTokenFromEvent(event),
      eventPathParameters = event.pathParameters,
      eventQueryString = event.queryStringParameters || {};
    this.LOG.logging(
      LOGGER.LEVEL_INFO,
      LOGGER.buildAnyMessage(
        "EGPC001",
        "Buscando Productos de la Empresa del Grupo Economico",
        "ID::CIS",
        `${eventPathParameters.economicGroupID}::${eventPathParameters.CISNumber}`
      )
    );

    eventPathParameters.CISNumber = decodeURI(eventPathParameters.CISNumber)
    eventPathParameters.CISNumber = eventPathParameters.CISNumber.trim()

    let economicGroupEnterpriseProducts = await this.economicGroupProductsService.economicGroupEnterprisesProductsDetail(
      eventPathParameters.economicGroupID,
      eventPathParameters.CISNumber,
      eventQueryString.offset,
      eventQueryString.limit,
      eventQueryString.sort,
      userToken
    );
    //Se obtiene el catálogo de subproductos
    let subproductsType = await this.enterpriseProductsService.getTransactionSubtypeCatalog();
    for (let i = 0; i < economicGroupEnterpriseProducts.rows.length; i++) {
      let subproductsTypeFilter = subproductsType.filter(
        s =>  s.subproduct == economicGroupEnterpriseProducts.rows[i].productSubtype && s.product === economicGroupEnterpriseProducts.rows[i].productType);
      if (subproductsTypeFilter.length > 0) {
        economicGroupEnterpriseProducts.rows[i].category = subproductsTypeFilter[0].category;
      } else {
        economicGroupEnterpriseProducts.rows.splice(i,1);
      }
    }
    return generateResponse(
      this.traceID,
      OK,
      StatusCodes.SUCCESSFUL_OPERATION,
      null,
      Utils.generatePaginatedResponse(
        eventQueryString.offset,
        eventQueryString.limit,
        economicGroupEnterpriseProducts.count,
        economicGroupEnterpriseProducts.rows
      )
    );
  }

  //APROBACION_GE
  async economicGroupEnterprisesProductsDetailTmp(event) {
    let userToken = Utils.getTokenFromEvent(event), 
      eventPathParameters = event.pathParameters,
      eventQueryString = event.queryStringParameters || {};
    this.LOG.logging(
      LOGGER.LEVEL_INFO,
      LOGGER.buildAnyMessage(
        "EGPC101",
        "Buscando Productos de la Empresa del Grupo Economico",
        "ID::CIS",
        `${eventPathParameters.economicGroupID}::${eventPathParameters.CISNumber}`
      )
    );
    let economicGroupEnterpriseProducts = await this.economicGroupProductsService.economicGroupEnterprisesProductsDetailTmp(
      eventPathParameters.economicGroupID,
      eventPathParameters.CISNumber,
      eventQueryString.offset,
      eventQueryString.limit,
      eventQueryString.sort,
      userToken
    );
    return generateResponse(
      this.traceID,
      OK,
      StatusCodes.SUCCESSFUL_OPERATION,
      null,
      Utils.generatePaginatedResponse(
        eventQueryString.offset,
        eventQueryString.limit,
        economicGroupEnterpriseProducts.count,
        economicGroupEnterpriseProducts.rows
      )
    );
  }

  async setEconomicGroupEnterpriseProducts(event) {
    let eventPathParameters = event.pathParameters,
      eventBody = JSON.parse(event.body),
      tokenData = Utils.getTokenInfoFromEvent(event);
    this.LOG.logging(
      LOGGER.LEVEL_INFO,
      LOGGER.buildAnyMessage(
        "EGPC002",
        "Estableciendo Productos de la Empresa del Grupo Economico",
        "ID::CIS",
        `${eventPathParameters.economicGroupID}::${eventPathParameters.CISNumber}`
      )
    );
    await this.economicGroupProductsService.setEconomicGroupProducts(
      eventPathParameters.economicGroupID,
      eventPathParameters.CISNumber,
      eventBody.products,
      eventBody.enterprise_details,
      tokenData.sub
    );
    return generateResponse(this.traceID, ACCEPTED, StatusCodes.SUCCESSFUL_OPERATION);
  }

  async getEconomicGroupProducts(event) {
    let eventPathParameters = event.pathParameters,
      eventQueryString = event.queryStringParameters || {};
    this.LOG.logging(
      LOGGER.LEVEL_INFO,
      LOGGER.buildAnyMessage("EGPC003", "Buscando Productos del Grupo Economico", "ID", `${eventPathParameters.economicGroupID}`)
    );
    let economicGroupProducts = await this.economicGroupProductsService.getEconomicGroupProducts(
      eventPathParameters.economicGroupID,
      eventQueryString.type
    );
    return generateResponse(
      this.traceID,
      OK,
      StatusCodes.SUCCESSFUL_OPERATION,
      null,
      Utils.generatePaginatedResponse(null, null, economicGroupProducts.count, economicGroupProducts.rows)
    );
  }

  async getEconomicGroupProductsByUser(event) {
    let userToken = Utils.getTokenFromEvent(event),
      eventQueryString = event.queryStringParameters || {};
    this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage("EGPC003", "Buscando Productos del Grupo Economico", "ID"));
    let economicGroupProducts = await this.economicGroupProductsService.getEconomicGroupProductsByUser(userToken, eventQueryString.type);
    return generateResponse(
      this.traceID,
      OK,
      StatusCodes.SUCCESSFUL_OPERATION,
      null,
      Utils.generatePaginatedResponse(null, null, economicGroupProducts.count, economicGroupProducts.rows)
    );
  }

  async deleteEconomicGroupEnterprise(event) {
    let eventPathParameters = event.pathParameters;
    this.LOG.logging(
      LOGGER.LEVEL_INFO,
      LOGGER.buildAnyMessage(
        "EGPC004",
        "Eliminando Empresa del Grupo Economico",
        "ID::CIS",
        `${eventPathParameters.economicGroupID}::${eventPathParameters.CISNumber}`
      )
    );
    await this.economicGroupProductsService.deleteEconomicGroupEnterprise(eventPathParameters.economicGroupID, eventPathParameters.CISNumber);
    return generateResponse(this.traceID, ACCEPTED, StatusCodes.SUCCESSFUL_OPERATION);
  }

  async getEconomicGroupEnterprisesDetailLegacy(event) {
    let eventQueryString = event.query || {};
    this.LOG.logging(
      LOGGER.LEVEL_INFO,
      LOGGER.buildAnyMessage("EGPC005", "Obteniendo Empresas del Grupo Economico LEGACY", "ID", `${eventQueryString.id}`)
    );
    let economicGroupEnterprisesDetail = await this.economicGroupProductsService.getEconomicGroupEnterprisesDetailLegacy(
      eventQueryString.id,
      eventQueryString.offset,
      eventQueryString.limit
    );
    this.LOG.logging(
      LOGGER.LEVEL_INFO,
      LOGGER.buildAnyMessage(
        "EGPC006",
        "Generando Respuesta Empresas del Grupo Economico LEGACY",
        "Respuesta Service",
        `${economicGroupEnterprisesDetail}`
      )
    );
    return generateResponse(
      this.traceID,
      OK,
      StatusCodes.SUCCESSFUL_OPERATION,
      null,
      Utils.generatePaginatedResponse(
        eventQueryString.offset,
        eventQueryString.limit,
        economicGroupEnterprisesDetail.count,
        economicGroupEnterprisesDetail.rows
      ),
      true
    );
  }
}

module.exports = {
  EconomicGroupProductsController
};
