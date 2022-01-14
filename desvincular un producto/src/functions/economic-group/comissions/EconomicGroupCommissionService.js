"use strict";

const { BaseObject } = require("../../../commons/BaseObject"),
    Sequelize = require("sequelize"),
    { generateResponse, INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY } = require("../../../commons/ResponseCreator"),
    StatusCodes = require("../../../commons/StatusCodes"),
    { Utils } = require("../../../commons/Utils"),
    LOGGER = require("@com-banistmo/scg-ms-logs-node"),
    { AuditProvider } = require('../../../commons/AWS/SNS/audit/AuditProvider');

class EconomicGroupCommissionService extends BaseObject{

    constructor(traceID, economicGroupCommissionDao){
        super(traceID);
        this.economicGroupCommissionDao = economicGroupCommissionDao;
    }

    async getEconomicGroupCommissionDetail(economicGroupID, event){
        try{
            let commissions = await this.economicGroupCommissionDao.getEconomicGroupCommissionDetail(economicGroupID);
            //Registro en auditoría
            let auditProvider = new AuditProvider(this.traceID);
            await auditProvider.sendQueryCommissionAuditMessage(event, economicGroupID);
            this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage("EGCS001", "Comisiones Obtenidas", "Comisiones:", commissions));
            return {
                commissions: commissions
            };
        }catch(error){
            this.LOG.logging(LOGGER.LEVEL_ERROR, LOGGER.buildAnyMessage("EGCS000", "Error Obteniendo las comisiones del Grupo Economico", "Error:",
                Utils.stringifyError(error)));
            throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_COMMISSIONS_GET_ERROR);
        }
    }

    //APROBACION_GE
    async getEconomicGroupCommissionDetailTmp(economicGroupID){
        try{
            let commissions = await this.economicGroupCommissionDao.getEconomicGroupCommissionDetailTmp(economicGroupID);
            this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage("EGCS101", "Comisiones Obtenidas", "Comisiones:", commissions));
            return {
                commissions: commissions
            };
        }catch(error){
            this.LOG.logging(LOGGER.LEVEL_ERROR, LOGGER.buildAnyMessage("EGCS100", "Error Obteniendo las comisiones del Grupo Economico en versión Tmp", "Error:",
                Utils.stringifyError(error)));
            throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_COMMISSIONS_GET_ERROR);
        }
    }

    async setEconomicGroupCommissions(economicGroupID, commissions, userOperation){
        let transactionBlock = async (transaction) => {
            let promisesToExecute = [];
            commissions.forEach((commission) => {
                promisesToExecute.push(this.economicGroupCommissionDao.setEconomicGroupCommission(economicGroupID, commission, transaction, userOperation))
            });
            return await Promise.all(promisesToExecute)
        };
        try{
            await this.economicGroupCommissionDao.executeTransaction(transactionBlock);
            this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage("EGCS001", "Comisiones Establecidas"));
        }catch(error){
            this.LOG.logging(LOGGER.LEVEL_ERROR, LOGGER.buildAnyMessage("EGCS000", "Error Estableciendo las comisiones del Grupo Economico", "Error:",
                Utils.stringifyError(error)));
            throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_COMMISSIONS_SET_ERROR);
        }
    }
}

module.exports = {
    EconomicGroupCommissionService
};
