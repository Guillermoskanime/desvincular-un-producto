"use strict";

const { BaseDAO } = require("../../../commons/db/dao/BaseDAO"),
    LOGGER = require("@com-banistmo/scg-ms-logs-node"),
    { EconomicGroupCommissionDTO } = require("../../../commons/db/dto/EconomicGroupCommissionDTO"),
    { TmpEconomicGroupCommissionDTO } = require("../../../commons/db/dto/tmp_dto/TmpEconomicGroupCommissionDTO"),
    { InactiveEconomicGroupCommissionDTO } = require("../../../commons/db/dto/tmp_dto/InactiveEconomicGroupCommissionDTO"),
    { EconomicGroupDTO } = require("../../../commons/db/dto/EconomicGroupDTO"),
    Constants = require("../../../commons/Constants");

class EconomicGroupCommissionDao extends BaseDAO {

    constructor(traceID) {
        super(traceID);
        this.database = Constants.DATABASE.DB_SVE_SCHEMA
    }

    async getEconomicGroupCommissionDetail(economicGroupID) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage("EGCD001", "Inicializando Modelos"));
        await this.initialize();
        let enterpriseEconomicGroupCommissionDTO = new EconomicGroupCommissionDTO(this.traceID, this.connection);
        let inactiveEconomicGroupCommissionDTO = new InactiveEconomicGroupCommissionDTO(this.traceID, this.connection);
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage("EGCD002", "Buscando Comisiones del Grupo Economico",
            "Grupo Economico:", JSON.stringify(economicGroupID)));
        let options = {
            attributes: ['economicGroupID', 'serviceName', 'discount', 'exonerationPeriods', 'commissionAccount', 'commissionBackupAccount', 'creationDate', 'lastModificationDate'],
            where: {
                economicGroupID: economicGroupID
            }
        }
        let commissions = await enterpriseEconomicGroupCommissionDTO.model.findAll(options);
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage("EGCD002", "Busqueda Comisiones del Grupo Economico exitosa",
            "Resultado:", JSON.stringify(commissions)));
        //Si la busqueda no da resultados se busca en la tabla de comisiones de GEs inactivos
        if (!commissions || commissions.length === 0) {
            commissions = await inactiveEconomicGroupCommissionDTO.model.findAll(options);
            this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage("EGCD002", "Busqueda Comisiones del Grupo Economico Inactivo exitosa",
                "Resultado:", JSON.stringify(commissions)));
        }
        return commissions;
    }

    //APROBACION_GE
    async getEconomicGroupCommissionDetailTmp(economicGroupID) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage("EGCD001", "Inicializando Modelos"));
        await this.initialize();
        let enterpriseEconomicGroupCommissionDTO = new TmpEconomicGroupCommissionDTO(this.traceID, this.connection);
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage("EGCD102", "Buscando Comisiones del Grupo Economico en version Tmp",
            "Grupo Economico:", JSON.stringify(economicGroupID)));
        let commissions = await enterpriseEconomicGroupCommissionDTO.model.findAll(
            {
                attributes: ['economicGroupID', 'serviceName', 'discount', 'exonerationPeriods', 'commissionAccount', 'commissionBackupAccount', 'lastModificationDate'],
                where: {
                    economicGroupID: economicGroupID
                }
            });
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage("EGCD102", "Busqueda Comisiones del Grupo Economico Tmp exitosa",
            "Resultado:", JSON.stringify(commissions)));
        return commissions;
    }

    async setEconomicGroupCommission(economicGroupID, commission, transaction, userOperation) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage("EGCD003", "Inicializando Modelos"));
        await this.initialize();
        let enterpriseEconomicGroupCommissionDTO = new EconomicGroupCommissionDTO(this.traceID, this.connection);
        let economicGroupDTO = new EconomicGroupDTO(this.traceID, this.connection);
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage("EGCD004", "Creando Comision del Grupo Economico",
            "Grupo Economico::Comision", `${JSON.stringify(economicGroupID)}::${JSON.stringify(commission)}`));
        await enterpriseEconomicGroupCommissionDTO.model.upsert(
            {
                economicGroupID: economicGroupID,
                serviceName: commission.service_name,
                discount: commission.discount,
                exonerationPeriods: commission.exoneration_periods,
                commissionAccount: commission.commission_account,
                commissionBackupAccount: commission.commission_backup_account,
                creationUser: userOperation,
                lastModificationUser: userOperation
            },
            {
                transaction: transaction
            }
        );

        //Se actualiza el estado de creación del GE
        let options = {
            where: {
                id: economicGroupID
            },
            transaction: transaction
        }
        let economicGroup = await economicGroupDTO.model.findOne(options);
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage("EGD014", "Grupo Economico para actualizar Stage", "Grupo Economico::Stage", `${JSON.stringify(economicGroup)}::${3}`));
        if (economicGroup && economicGroup.creationStage < 3) {
            await economicGroupDTO.model.update({
                creationStage: 3,
                lastModificationUser: userOperation,
                lastModificationDate: Date.now()
            }, options);
            this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage("EGD013", "Grupo Economico Stage Actualizado", "Grupo Economico::Stage", `${JSON.stringify(economicGroupID)}::${3}`));
        }
    }

    async insertIntoCommissionTmp(commissions, economicGroupId, user, copyFlags, transaction) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage("EGD101", "Inicializando Modelos", "data: ",
            { commissions, economicGroupId, user }));
        //Se inicializa modelo de productos
        await this.initialize();
        const tmpEnterpriseEconomicGroupCommissionDTO = new TmpEconomicGroupCommissionDTO(this.traceID, this.connection);
        //Se remapea el array de productos para hacer un bulk
        const commissionArray = [];
        for (let i = 0; i < commissions.length; i++) {
            commissionArray.push({
                economicGroupID: economicGroupId,
                serviceName: commissions[i].name,
                discount: commissions[i].discount,
                exonerationPeriods: commissions[i].exonerationPeriod,
                commissionAccount: commissions[i].chargeAccount,
                commissionBackupAccount: commissions[i].chargeAccountBackup,
                lastModificationUser: user,
                lastModificationDate: new Date(),
            });
        }
        //Se insertan productos en tablas temporales
        await tmpEnterpriseEconomicGroupCommissionDTO.model.bulkCreate(commissionArray, { transaction: transaction });
        copyFlags.commissions = false;
    }

    async insertIntoCommission(commissions, economicGroupId, user, copyFlags, transaction) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage("EGD101", "Inicializando Modelos", "data: ",
            { commissions, economicGroupId, user }));
        //Se inicializa modelo de productos
        await this.initialize();
        const enterpriseEconomicGroupCommissionDTO = new EconomicGroupCommissionDTO(this.traceID, this.connection);
        //Se remapea el array de productos para hacer un bulk
        const commissionArray = [];
        for (let i = 0; i < commissions.length; i++) {
            commissionArray.push({
                economicGroupID: economicGroupId,
                serviceName: commissions[i].name,
                discount: commissions[i].discount,
                exonerationPeriods: commissions[i].exonerationPeriod,
                commissionAccount: commissions[i].chargeAccount,
                commissionBackupAccount: commissions[i].chargeAccountBackup,
                creationUser: user,
                creationDate: new Date(),
            });
        }
        //Se insertan productos en tablas temporales
        await enterpriseEconomicGroupCommissionDTO.model.bulkCreate(commissionArray, { updateOnDuplicate: ['economicGroupID', 'serviceName'], transaction: transaction });
        copyFlags.commissions = false;
    }
}

module.exports = {
    EconomicGroupCommissionDao
};
