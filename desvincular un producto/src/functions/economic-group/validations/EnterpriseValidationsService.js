"use strict";

const { BaseObject } = require("../../../commons/BaseObject"),
  { generateResponse, INTERNAL_SERVER_ERROR } = require("../../../commons/ResponseCreator"),
  StatusCodes = require("../../../commons/StatusCodes"),
  LOGGER = require("@com-banistmo/scg-ms-logs-node"),
  { ProductsValidationsService } = require("./ProductsValidationsService");

class EnterpriseValidationsService extends BaseObject {
  constructor(traceID, economicGroupProductsDao, economicGroupDao, economicGroupCommissionDao) {
    super(traceID);
    this.economicGroupProductsDao = economicGroupProductsDao;
    this.productsValidationsService = new ProductsValidationsService(traceID, economicGroupProductsDao, economicGroupDao, economicGroupCommissionDao);
    this.errorsMap = {};
    this.errorsMap.enterprises = [];
    this.errorsMap.products = [];
  }

  /**
   * Método encargado de orquestar todas las validaciones de empresas y productos
   * @param {Number} economicGroupId
   * @param {Object} enterprises
   * @param {Object} products
   * @param {Array} commissions
   */
  async validations(economicGroupId, enterprises, products, commissions, tokenInfo) {
    this.LOG.logging(
      LOGGER.LEVEL_DEBUG,
      LOGGER.buildAnyMessage("EGVEN001", "Enterprise validations", "Input body", {
        economicGroupId,
        enterprises,
        products,
        commissions
      })
    );
    let promisesArray = [];
    if (enterprises.associated && enterprises.associated.length > 0) {
      //Se validan empresas a asociar
      promisesArray.push(this.associateValidations(economicGroupId, enterprises.associated));
    }
    if (enterprises.unassociated && enterprises.unassociated.length > 0) {
      if (!products.unassociated) {
        //Si no hay productos para desasociar se debe crear primero su variable
        products.unassociated = [];
      }
      //Se valida empresas que se van a desasociar, y sobre los productos que se desasocian se concatena los de las empresas que se van a desasociar para tambien validarlos
      promisesArray.push(this.deleteValidations(economicGroupId, enterprises, products));
    }
    await Promise.all(promisesArray);
    //Se realiza validación en los productos tanto para asociar y desasociar
    const productsValidationResult = await this.productsValidationsService.validations(economicGroupId, products, commissions, tokenInfo);
    if (productsValidationResult.length !== 0) {
      //Si hay errores se añaden a la llave respectiva en la respuesta
      this.errorsMap.products = productsValidationResult;
    }
    return this.errorsMap;
  }

  /**
   * Método para validar de que las empresas a asociar no esten en otro grupo economico
   * @param {Number} economicGroupId
   * @param {Array} associatedEnterprises
   */
  async associateValidations(economicGroupId, associatedEnterprises) {
    this.LOG.logging(
      LOGGER.LEVEL_DEBUG,
      LOGGER.buildAnyMessage("EGVEN002", "Enterprise association validations", "Input body", {
        economicGroupId,
        associatedEnterprises
      })
    );
    let daoCallResult;
    try {
      //Se remapean empresas a solo sus CIS, para poder realizar consultas
      let associatedEnterprisesIds = associatedEnterprises.map(enterprise => {
        return enterprise.cis;
      });
      //Call a dao para obtener empresas asociadas a otros grupos economicos
      daoCallResult = await this.economicGroupProductsDao.getNoNAssociatedEnterprisesForAnEG(associatedEnterprisesIds, economicGroupId);
      if (daoCallResult[0].count !== 0 || daoCallResult[1].count !== 0) {
        const concatenatedArray = daoCallResult[0].rows.concat(daoCallResult[1].rows);
        this.LOG.logging(
          LOGGER.LEVEL_DEBUG,
          LOGGER.buildAnyMessage("EGVEN007", "Concatenated enterprises arrays", "Data: ", {
            concatenatedArray
          })
        );
        let enterprisesCis = [];
        for (let index = 0; index < concatenatedArray.length; index++) {
          enterprisesCis.push(concatenatedArray[index].cisNumber);
        }
        this.LOG.logging(
          LOGGER.LEVEL_DEBUG,
          LOGGER.buildAnyMessage("EGVEN008", "Enterprises CIS array", "Data: ", {
            enterprisesCis
          })
        );
        StatusCodes.ECONOMIC_GROUP_CIS_ALREADY_ASSOCIATED.detail = enterprisesCis;
        //Se añade el error de grupo economico
        this.errorsMap.enterprises.push(StatusCodes.ECONOMIC_GROUP_CIS_ALREADY_ASSOCIATED);
      }
    } catch (error) {
      this.LOG.logging(
        LOGGER.LEVEL_ERROR,
        LOGGER.buildAnyMessage("EGVEN011", "Error Validando empresa asociadas", "Error:", Utils.stringifyError(error))
      );
      throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_CIS_ASSOCIATION_ERROR);
    }
  }

  /**
   * Método que orquesta las validaciones de las empresas a desasociar
   * @param {Number} economicGroupId
   * @param {Array} enterprises
   * @param {Array} products
   */
  async deleteValidations(economicGroupId, enterprises, products) {
    this.LOG.logging(
      LOGGER.LEVEL_DEBUG,
      LOGGER.buildAnyMessage("EGVEN003", "Enterprise unassociation validations", "Input body", {
        economicGroupId,
        enterprises,
        products
      })
    );
    try {
      await this.egWithNoEnterprisesValidation(economicGroupId, enterprises);
      await this.unnasociatedEnterprisesValidation(economicGroupId, enterprises.unassociated, products);
    } catch (error) {
      throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_CIS_UNASSOCIATION_ERROR);
    }
  }

  /**
   * Método para realziar validación de grupo economico con almenos 1 empresa asociada
   * @param {Number} economicGroupId
   * @param {Array} enterprises
   * @param {Array} associatedEnterprises
   */
  async egWithNoEnterprisesValidation(economicGroupId, enterprises) {
    //Se buscan y concatenan el resto de empresas que ya estan asociadas al grupo economico
    let concatenatedEnterprises = await this.economicGroupProductsDao.searchMapAndConcatEnterprises(economicGroupId, enterprises);
    this.LOG.logging(
      LOGGER.LEVEL_DEBUG,
      LOGGER.buildAnyMessage("EGVEN009", "Enterprises array length validation", "Data: ", {
        concatenatedEnterprises,
        enterprises,
        associatedLength: concatenatedEnterprises.length,
        unassociatedLength: enterprises.unassociated.length
      })
    );
    //Si no tiene al menos una empresa, entonces error
    if (concatenatedEnterprises.length < 1) {
      this.errorsMap.enterprises.push(StatusCodes.ECONOMIC_GROUP_WITH_NO_ENTERPRISES_ERROR);
    }
  }

  /**
   * Método para realizar la validación de los productos de las empresas a desasociar
   * @param {Number} economicGroupId
   * @param {Array} unassocciatedEnterprises
   * @param {Array} products
   */
  async unnasociatedEnterprisesValidation(economicGroupId, unassocciatedEnterprises, products) {
    let formattedArray;
    //Se remapean empresas a solo sus CIS, para poder realizar consultas
    let unassociatedEnterprisesIds = unassocciatedEnterprises.map(enterprise => {
      return enterprise.cis;
    });
    this.LOG.logging(
      LOGGER.LEVEL_DEBUG,
      LOGGER.buildAnyMessage("EGVEN010", "Unnasociated enterprises CIS", "Data: ", {
        unassociatedEnterprisesIds
      })
    );
    //Call a dao para obtener los productos de las empresas
    let rdsProducts = await this.economicGroupProductsDao.getMultipleEnterpriseProducts(unassociatedEnterprisesIds, economicGroupId);
    this.LOG.logging(
      LOGGER.LEVEL_DEBUG,
      LOGGER.buildAnyMessage("EGVEN0011", "Products obtained from RDS", "Data: ", {
        rdsProducts
      })
    );
    if (rdsProducts.count !== 0) {
      //Si la consulta obtuvo productos se procede a remapear los productos para la validación
      formattedArray = rdsProducts.rows.map(product => {
        let formattedProduct = {
          acctId: product.productNumber,
          name: product.name,
          cis: product.cisNumber,
          currency: product.currencyCode,
          subType: product.productSubtype,
          productType: product.productType,
        };
        return formattedProduct;
      });
    }
    this.LOG.logging(
      LOGGER.LEVEL_DEBUG,
      LOGGER.buildAnyMessage("EGVEN012", "Formatted products array", "Data: ", {
        formattedArray
      })
    );
    //Se concatenan los productos formateados a los ya enviados a desasociar desde el front
    products.unassociated = products.unassociated.concat(formattedArray);
    this.LOG.logging(
      LOGGER.LEVEL_DEBUG,
      LOGGER.buildAnyMessage("EGVEN013", "Products concatenated", "Data: ", {
        products
      })
    );
  }
}

module.exports = {
  EnterpriseValidationsService
};
