"use strict";

const { BaseObject } = require("../../../commons/BaseObject"),
  { generateResponse, INTERNAL_SERVER_ERROR } = require("../../../commons/ResponseCreator"),
  StatusCodes = require("../../../commons/StatusCodes"),
  { CacheProvider } = require("../../../commons/cache/CacheProvider"),
  Constants = require("../../../commons/Constants"),
  { Utils } = require("../../../commons/Utils"),
  LOGGER = require("@com-banistmo/scg-ms-logs-node");

class EconomicGroupTransactionLimitsService extends BaseObject {
  constructor(traceID, economicGroupTransactionLimitsDao) {
    super(traceID);
    this.cacheProvider = new CacheProvider(traceID);
    this.economicGroupTransactionLimitsDao = economicGroupTransactionLimitsDao;
  }

  async getEconomicGroupTransactionLimits(channelName, economicGroupID) {
    try {
      let qualifier = `economicGroupId=${economicGroupID}&channelName=${channelName}`;
      let transactionLimits = await this.cacheProvider.getValueFromCache(
        Constants.CACHE.SERVICE_LIMITS,
        Constants.CACHE.ENTITY_LIMITS,
        Constants.CACHE.ATRIBUTE,
        qualifier
      );
      if (!transactionLimits) {
        transactionLimits = await this.economicGroupTransactionLimitsDao.getEconomicGroupTransactionLimits(channelName, economicGroupID);
        await this.cacheProvider.putValueInCache(
          Constants.CACHE.SERVICE_LIMITS,
          Constants.CACHE.ENTITY_LIMITS,
          Constants.CACHE.ATRIBUTE,
          qualifier,
          transactionLimits
        );
      }
      this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage("EGTLS001", "Limites Transaccionales Obtenidos", "Limites:", transactionLimits));
      return {
        transaction_limits: transactionLimits
      };
    } catch (error) {
      this.LOG.logging(
        LOGGER.LEVEL_ERROR,
        LOGGER.buildAnyMessage("EGTLS000", "Error Obteniendo los limites transaccionales del Grupo Economico", "Error:", Utils.stringifyError(error))
      );
      throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_TRANSACTION_LIMITS_GET_ERROR);
    }
  }

  /**
   * APROBACION_GE
   * Consulta los límites de un GE en su versión de actualización
   * @param {String} channelName
   * @param {Number} economicGroupID
   */
  async getEconomicGroupTransactionLimitsTmp(channelName, economicGroupID) {
    try {
      let qualifier = `economicGroupId=${economicGroupID}&channelName=${channelName}`;
      let transactionLimits = await this.cacheProvider.getValueFromCache(
        Constants.CACHE.SERVICE_LIMITS_TMP,
        Constants.CACHE.ENTITY_LIMITS_TMP,
        Constants.CACHE.ATRIBUTE,
        qualifier
      );
      if (!transactionLimits) {
        transactionLimits = await this.economicGroupTransactionLimitsDao.getEconomicGroupTransactionLimitsTmp(channelName, economicGroupID);
        await this.cacheProvider.putValueInCache(
          Constants.CACHE.SERVICE_LIMITS_TMP,
          Constants.CACHE.ENTITY_LIMITS_TMP,
          Constants.CACHE.ATRIBUTE,
          qualifier,
          transactionLimits
        );
      }
      this.LOG.logging(
        LOGGER.LEVEL_INFO,
        LOGGER.buildAnyMessage("EGTLS001", "Limites Transaccionales Obtenidos para Versión en actualización del GE", "Limites:", transactionLimits)
      );
      return {
        transaction_limits: transactionLimits
      };
    } catch (error) {
      this.LOG.logging(
        LOGGER.LEVEL_ERROR,
        LOGGER.buildAnyMessage(
          "EGTLS000",
          "Error Obteniendo los limites transaccionales del Grupo Economico en su versiómn de actualización",
          "Error:",
          Utils.stringifyError(error)
        )
      );
      throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_TRANSACTION_LIMITS_GET_ERROR);
    }
  }

  async setEconomicGroupTransactionLimits(channelName, economicGroupID, transactionLimits, userModification) {
    let transactionBlock = async transaction => {
      let promisesToExecute = [];
      transactionLimits.forEach(transactionLimit => {
        promisesToExecute.push(
          new Promise(async (resolve, reject) => {
            try {
              let economicGroupMonetaryLimit = await this.economicGroupTransactionLimitsDao.updateEconomicGroupTransactionGroupChannel(
                transaction,
                economicGroupID,
                transactionLimit.transaction_group_channel_id,
                userModification
              );
              this.LOG.logging(
                LOGGER.LEVEL_INFO,
                LOGGER.buildAnyMessage("EGTLS002", "Id del Límite Por Transacción establecido", "ID:", JSON.stringify(economicGroupMonetaryLimit))
              );
              let limitInsertUpdatePromises = [];
              Object.keys(transactionLimit).forEach(key => {
                switch (key) {
                  case "transaction":
                  case "daily":
                  case "monthly":
                    limitInsertUpdatePromises.push(
                      this.economicGroupTransactionLimitsDao.setEconomicGroupTransactionGroupChannelLimit(
                        transaction,
                        economicGroupMonetaryLimit.id,
                        key,
                        transactionLimit[key]["bottom_limit"],
                        transactionLimit[key]["top_limit"]
                      )
                    );
                    break;
                  default:
                    break;
                }
              });
              resolve(await Promise.all(limitInsertUpdatePromises));
            } catch (error) {
              reject(error);
            }
          })
        );
      });
      await Promise.all(promisesToExecute);
    };
    try {
      //Se limpia cache
      let qualifier = `economicGroupId=${economicGroupID}*`;
      await this.cacheProvider.delKeyFromCache("*", "*", "*", qualifier, "*");
      await this.economicGroupTransactionLimitsDao.executeTransaction(transactionBlock);
      this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage("EGTLS001", "Limites Transaccionales Establecidos", "Limites:", transactionLimits));
    } catch (error) {
      this.LOG.logging(
        LOGGER.LEVEL_ERROR,
        LOGGER.buildAnyMessage("EGTLS000", "Error Obteniendo los limites transaccionales del Grupo Economico", "Error:", Utils.stringifyError(error))
      );
      throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_TRANSACTION_LIMITS_SET_ERROR);
    }
  }
}

module.exports = {
  EconomicGroupTransactionLimitsService
};
