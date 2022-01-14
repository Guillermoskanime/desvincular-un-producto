'use strict';

const { BaseDAO } = require('../../../commons/db/dao/BaseDAO'),
    { EconomicGroupMonetaryLimitDTO } = require('../../../commons/db/dto/EconomicGroupMonetaryLimitDTO'),
    { EconomicGroupMonetaryLimitValueDTO } = require('../../../commons/db/dto/EconomicGroupMonetaryLimitValueDTO'),
    LOGGER = require('@com-banistmo/scg-ms-logs-node'),
    Sequelize = require('sequelize'),
    Constants = require('../../../commons/Constants'),
    { TmpEconomicGroupMonetaryLimitDTO } = require('../../../commons/db/dto/tmp_dto/TmpEconomicGroupMonetaryLimitDTO'),
    { TmpEconomicGroupMonetaryLimitValueDTO } = require('../../../commons/db/dto/tmp_dto/TmpEconomicGroupMonetaryLimitValueDTO'),
    { EconomicGroupDTO } = require('../../../commons/db/dto/EconomicGroupDTO');

class EconomicGroupTransactionLimitsDao extends BaseDAO {
    constructor(traceID) {
        super(traceID);
        this.database = Constants.DATABASE.DB_SVE_SCHEMA;
    }

    async getEconomicGroupTransactionLimits(channelName, economicGroupID) {
        await this.initialize();
        return new Promise((resolve, reject) => {
            this.connection
                .query(Constants.SQL.PROCEDURES.GET_ECONOMIC_GROUP_TRANSACTION_LIMITS_BY_CHANNEL, {
                    bind: {
                        channelName: channelName,
                        economicGroupID: economicGroupID,
                    },
                    type: Sequelize.QueryTypes.SELECT,
                    raw: true,
                })
                .catch((error) => reject(error))
                .spread((result) => {
                    let results = [];
                    Object.keys(result).forEach((key) => {
                        results.push(result[key]);
                    });
                    resolve(results);
                });
        });
    }

    /**
     * APROBACION_GE
     * Obtiene los límites de la versión en actualización de un GE
     * @param {String} channelName
     * @param {Number} economicGroupID
     */
    async getEconomicGroupTransactionLimitsTmp(channelName, economicGroupID) {
        await this.initialize();
        return new Promise((resolve, reject) => {
            this.connection
                .query(Constants.SQL.PROCEDURES.GET_ECONOMIC_GROUP_TRANSACTION_LIMITS_BY_CHANNEL_TMP, {
                    bind: {
                        channelName: channelName,
                        economicGroupID: economicGroupID,
                    },
                    type: Sequelize.QueryTypes.SELECT,
                    raw: true,
                })
                .catch((error) => reject(error))
                .spread((result) => {
                    let results = [];
                    Object.keys(result).forEach((key) => {
                        results.push(result[key]);
                    });
                    resolve(results);
                });
        });
    }

    async updateEconomicGroupTransactionGroupChannel(transaction, economicGroupID, transactionGroupChannelID, userModification) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGTLD001', 'Inicializando Modelos'));
        await this.initialize();
        let economicGroupMonetaryLimitDTO = new EconomicGroupMonetaryLimitDTO(this.traceID, this.connection);
        let economicGroupDTO = new EconomicGroupDTO(this.traceID, this.connection);
        this.LOG.logging(
            LOGGER.LEVEL_DEBUG,
            LOGGER.buildAnyMessage(
                'EGTLD002',
                'Upsert Limites del Grupo Economico',
                'economicGroupID::transactionGroupChannelID::userModification',
                `${JSON.stringify(economicGroupID)}::${JSON.stringify(transactionGroupChannelID)}::${JSON.stringify(userModification)}`
            )
        );
        let economicGroupMonetaryLimit = await economicGroupMonetaryLimitDTO.model.upsert(
            {
                transactionGroupChannelID: transactionGroupChannelID,
                economicGroupID: economicGroupID,
                lastModificationUser: userModification,
                lastModificationDate: Date.now(),
            },
            {
                transaction: transaction,
            }
        );
        this.LOG.logging(
            LOGGER.LEVEL_DEBUG,
            LOGGER.buildAnyMessage(
                'EGTLD003',
                'Upsert Limites del Grupo Economico exitoso',
                'Grupo Economico Limite:',
                JSON.stringify(economicGroupMonetaryLimit)
            )
        );
        //Se actualiza el estado de creación del GE
        let options = {
            where: {
                id: economicGroupID,
            },
            transaction: transaction,
        };
        let economicGroup = await economicGroupDTO.model.findOne(options);
        this.LOG.logging(
            LOGGER.LEVEL_DEBUG,
            LOGGER.buildAnyMessage('EGD014', 'Grupo Economico para actualizar Stage', 'Grupo Economico::Stage', `${JSON.stringify(economicGroup)}::${1}`)
        );
        if (economicGroup && economicGroup.creationStage < 1) {
            await economicGroupDTO.model.update(
                {
                    creationStage: 1,
                    lastModificationUser: userModification,
                    lastModificationDate: Date.now(),
                },
                options
            );
            this.LOG.logging(
                LOGGER.LEVEL_DEBUG,
                LOGGER.buildAnyMessage('EGD013', 'Grupo Economico Stage Actualizado', 'Grupo Economico::Stage', `${JSON.stringify(economicGroupID)}::${1}`)
            );
        }
        return await economicGroupMonetaryLimitDTO.model.findOne({
            where: {
                transactionGroupChannelID: transactionGroupChannelID,
                economicGroupID: economicGroupID,
            },
            transaction: transaction,
            attributes: ['id'],
        });
    }

    async setEconomicGroupTransactionGroupChannelLimit(transaction, economicGroupMonetaryLimitID, type, bottomLimit, topLimit) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGTLD004', 'Inicializando Modelos'));
        await this.initialize();
        let economicGroupMonetaryLimitValueDTO = new EconomicGroupMonetaryLimitValueDTO(this.traceID, this.connection);
        this.LOG.logging(
            LOGGER.LEVEL_DEBUG,
            LOGGER.buildAnyMessage(
                'EGTLD005',
                'Upsert Limites del Grupo Economico por canal y grupo de transacciones',
                'Grupo Economico TG Channel ID:',
                `${JSON.stringify(economicGroupMonetaryLimitID)}::${type}`
            )
        );
        await economicGroupMonetaryLimitValueDTO.model.upsert(
            {
                economicGroupMonetaryLimitID: economicGroupMonetaryLimitID,
                typeLimit: type,
                minValue: bottomLimit,
                maxValue: topLimit,
            },
            {
                transaction: transaction,
            }
        );
    }

    async insertIntoLimitsTmp(limits, economicGroupId, user, copyFlags, transaction) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD022', 'Inicializando Modelos', 'data: ', { limits, economicGroupId, user }));
        //Se inicializa modelo de limites
        const tmpEconomicGroupMonetaryLimitDTO = new TmpEconomicGroupMonetaryLimitDTO(this.traceID, this.connection);
        const tmpEconomicGroupMonetaryLimitValueDTO = new TmpEconomicGroupMonetaryLimitValueDTO(this.traceID, this.connection);
        //Se remapea el array de limites para hacer un bulk
        const limitArray = [];
        const limitTmpArray = [];
        const limitValueArray = [];
        for (let i = 0; i < limits.length; i++) {
            if (limitTmpArray.indexOf(limits[i].transactionGroupChannelId) === -1) {
                limitArray.push({
                    economicGroupID: economicGroupId,
                    id: limits[i].limitId,
                    lastModificationDate: new Date(),
                    lastModificationUser: user,
                    transactionGroupChannelID: limits[i].transactionGroupChannelId,
                });
                limitTmpArray.push(limits[i].transactionGroupChannelId);
            }

            limitValueArray.push({
                economicGroupMonetaryLimitID: limits[i].limitId,
                typeLimit: limits[i].type,
                economicGroupID: economicGroupId,
                minValue: limits[i].minValue,
                maxValue: limits[i].maxValue,
            });
        }
        //Se insertan limites en tablas temporales
        const limitsPromises = [];
        limitsPromises.push(tmpEconomicGroupMonetaryLimitDTO.model.bulkCreate(limitArray, { transaction: transaction }));
        limitsPromises.push(tmpEconomicGroupMonetaryLimitValueDTO.model.bulkCreate(limitValueArray, { transaction: transaction }));
        await Promise.all(limitsPromises);
        copyFlags.limits = false;
    }

    async insertIntoLimits(limits, economicGroupId, user, copyFlags, transaction) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD052', 'Inicializando Modelos', 'data: ', { limits, economicGroupId, user }));
        //Se inicializa modelo de limites
        const economicGroupMonetaryLimitDTO = new EconomicGroupMonetaryLimitDTO(this.traceID, this.connection);
        const economicGroupMonetaryLimitValueDTO = new EconomicGroupMonetaryLimitValueDTO(this.traceID, this.connection);
        //Se remapea el array de limites para hacer un bulk
        const limitArray = [];
        const limitTmpArray = [];
        const limitValueArray = [];
        for (let i = 0; i < limits.length; i++) {
            if (limitTmpArray.indexOf(limits[i].transactionGroupChannelId) === -1) {
                limitArray.push({
                    economicGroupID: economicGroupId,
                    id: limits[i].limitId,
                    lastModificationDate: new Date(),
                    lastModificationUser: user,
                    transactionGroupChannelID: limits[i].transactionGroupChannelId,
                });
                limitTmpArray.push(limits[i].transactionGroupChannelId);
            }

            limitValueArray.push({
                economicGroupMonetaryLimitID: limits[i].limitId,
                typeLimit: limits[i].type,
                minValue: limits[i].minValue,
                maxValue: limits[i].maxValue,
            });
        }
        //Se insertan limites en tablas temporales
        const limitsPromises = [];
        limitsPromises.push(economicGroupMonetaryLimitDTO.model.bulkCreate(limitArray, { updateOnDuplicate: ['id'], transaction: transaction }));
        limitsPromises.push(
            economicGroupMonetaryLimitValueDTO.model.bulkCreate(limitValueArray, {
                updateOnDuplicate: ['economicGroupMonetaryLimitID', 'typeLimit'],
                transaction: transaction,
            })
        );
        await Promise.all(limitsPromises);
        copyFlags.limits = false;
    }

    async getTransactionLimitsByChannel(channelName) {
        await this.initialize();
        let results = await this.connection.query(Constants.SQL.PROCEDURES.SP_CALL_GET_CHANNEL_TRANSACTION_LIMITS, {
            replacements: {
                channelName: channelName,
                offsetValue: 0,
                limitValue: 10,
            },
            type: Sequelize.QueryTypes.SELECT,
            raw: true,
        });
        this.LOG.logging(
            LOGGER.LEVEL_DEBUG,
            LOGGER.buildAnyMessage('EGTLD006', 'getTransactionLimitsByChannel', 'Result QUERY: ', `${JSON.stringify(results)}`)
        );
        let result = null;
        let result_array = [];
        if (results && results[0]) {
            result = results[0];
            Object.keys(result).forEach((key) => {
                result_array.push(result[key]);
            });
        }
        this.LOG.logging(
            LOGGER.LEVEL_DEBUG,
            LOGGER.buildAnyMessage('EGTLD007', 'getTransactionLimitsByChannel', 'Result Limits: ', `${JSON.stringify(result_array)}`)
        );
        return result_array;
    }

    async getLimitsEconomicGroup(economicGroupId, limitIds) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD029', 'Inicializando Modelos'));
        await this.initialize();
        let economicGroupMonetaryLimitDTO = new EconomicGroupMonetaryLimitDTO(this.traceID, this.connection);
        let options = {
            where: {
                id: {
                    [Sequelize.Op.in]: limitIds,
                },
                economicGroupID: economicGroupId,
            },
        };
        let limits = await economicGroupMonetaryLimitDTO.model.findAndCountAll(options);
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD030', 'Transacciones encontradas', 'Flujos:', JSON.stringify(limits)));
        return limits;
    }
}

module.exports = {
    EconomicGroupTransactionLimitsDao,
};
