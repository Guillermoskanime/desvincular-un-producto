'use strict'

const { BaseDAO } = require('../../../commons/db/dao/BaseDAO'),
    LOGGER = require('@com-banistmo/scg-ms-logs-node'),
    { UsersEnterprisesDTO } = require('../../../commons/db/dto/UsersEnterprisesDTO'),
    { TmpUsersEnterprisesDTO } = require('../../../commons/db/dto/tmp_dto/TmpUserEnterprisesDTO'),
    Constants = require('../../../commons/Constants')

class EconomicGroupUsersDao extends BaseDAO {
    constructor(traceID) {
        super(traceID)
        this.database = Constants.DATABASE.DB_SVE_SCHEMA
    }

    /**
     * Metódo encargado de ejecutar queries a base de datos
     * @param {*} query
     * @param {*} options
     * @param {*} needMap Flag para activar el mapeo de sequelize
     */
    async queryCallToDB(query, options, needMap) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGDU001', 'Database querying', 'Data a enviar al query: ', { query, bind: options.bind }))
        let result = await this.connection.query(query, options)
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGDU002', 'Database querying result', 'Data de resultado de query: ', result))
        if (needMap) {
            let result_arr = []
            if (result && result[0]) {
                result = result[0]
                Object.keys(result).forEach((key) => {
                    result_arr.push(result[key])
                })
            }
            result = result_arr
            this.LOG.logging(
                LOGGER.LEVEL_DEBUG,
                LOGGER.buildAnyMessage('EGDU003', 'Database querying result mapped', 'Data mapeada de resultado de query: ', result)
            )
        }
        return result
    }

    /**
     * Get status by abbreviature
     * @param {*} event
     * @param {*} context
     */
    async getStatusByAbbreviature(statusAbbreviature) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGDU004', 'Obtaining status', 'Obteniendo estados', statusAbbreviature))
        const options = {
            attributes: ['id'],
            bind: {
                in_abbreviature: statusAbbreviature,
            },
            raw: true,
            type: this.connection.QueryTypes.SELECT,
        }
        return await this.queryCallToDB(Constants.SQL.PROCEDURES.SP_GET_STATUS_BY_ABBREVIATURE, options, true)
    }

    /**
     * Consulta los usuarios del GE en proceso de reemplazo
     * @param {*} filter
     * @param {*} offset
     * @param {*} limit
     */
    async getPendingReplaceMainUser(filter, offset, limit) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGDU011', 'getPendingReplaceMainUser', 'Parameters:', { filter, offset, limit }))
        let query = Constants.SQL.PROCEDURES.SP_GET_PENDING_REPLACE_MAIN_USERS
        const options = {
            bind: {
                in_offset: offset,
                in_limit: limit,
            },
            raw: true,
            type: this.connection.QueryTypes.SELECT,
        }
        options.bind.in_filter = null
        if (filter) {
            options.bind.in_filter = filter
        }

        let results = await this.connection.query(query, options)
        let total = await this.connection.query(Constants.SQL.PROCEDURES.SELECT_TOTAL_QUERY, {
            type: this.connection.QueryTypes.SELECT,
        })
        let result_arr = []
        if (results && results[0]) {
            let result = results[0]
            Object.keys(result).forEach((key) => {
                result_arr.push(result[key])
            })
        }
        this.LOG.logging(
            LOGGER.LEVEL_DEBUG,
            LOGGER.buildAnyMessage('EGDU012', 'getPendingReplaceMainUser', 'Result:', { users: result_arr, total: total[0]['@out_total'] })
        )
        return {
            users: result_arr,
            total: total[0]['@out_total'],
        }
    }

    async updateUserStatus(economicGroupID, userId, status, updateUser) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGDU005', 'Inicializando modelos', 'Data: ', { economicGroupID, userId, status }))
        let usersEnterprises = new UsersEnterprisesDTO(this.traceID, this.connection)
        let updatedUser = await usersEnterprises.model.update(
            {
                statusID: status,
                lastModificationUser: updateUser,
                lastModificationDate: Date.now(),
            },
            {
                where: {
                    id: userId,
                },
            }
        )
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGDU006', 'Usuario actualizado', 'Data: ', updatedUser))
        return updatedUser
    }

    async getUserNonTmp(userId) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGDU009', 'Inicializando modelos', 'Data: ', { userId }))
        let usersEnterprises = new UsersEnterprisesDTO(this.traceID, this.connection)
        let user = await usersEnterprises.model.findAndCountAll({
            where: {
                id: userId,
            },
        })
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGDU010', 'Usuario obtenido', 'Data: ', user))
        return user.rows[0]
    }

    async getUserTemp(userId) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGDU011', 'Inicializando modelos', 'Data: ', { userId }))
        let tmpUsersEnterprisesDTO = new TmpUsersEnterprisesDTO(this.traceID, this.connection)
        let user = await tmpUsersEnterprisesDTO.model.findAndCountAll({
            where: {
                id: userId,
            },
        })
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGDU012', 'Usuario obtenido', 'Data: ', user))
        return user.rows[0]
    }

    async saveUserTmp(newUser, newStatus, economicGroupId, rolId, replacedUserId) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGDU013', 'Inicializando modelos', 'Data: ', { newUser }))
        let tmpUsersEnterprisesDTO = new TmpUsersEnterprisesDTO(this.traceID, this.connection)
        let user = await tmpUsersEnterprisesDTO.model.upsert({
            name: newUser.userName,
            lastName: newUser.userLastName,
            idType: newUser.identificationType,
            idNumber: newUser.identificationNumber,
            countryExpedition: newUser.userCountryExpedition,
            email: newUser.userEmail,
            hasTransactionAccess: newUser.transactionsAccess,
            statusIdNew: newStatus,
            economicGroupId: economicGroupId,
            rolId: rolId,
            userId: replacedUserId,
            mobile: newUser.mobile,
            countryCodeMobile: newUser.countryCodeMobile,
        })
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGDU014', 'Usuario guardado', 'Data: ', user))
        return user
    }

    async updateUser(userId, status, updateUser) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGDU013', 'Inicializando modelos', 'Data: ', { userId }))
        let tmpUsersEnterprisesDTO = new TmpUsersEnterprisesDTO(this.traceID, this.connection)
        let updatedUser = await tmpUsersEnterprisesDTO.model.update(
            {
                statusIdNew: status,
                updateUser: updateUser,
                updateTime: Date.now(),
            },
            {
                where: {
                    id: userId,
                },
            }
        )
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGDU006', 'Usuario actualizado', 'Data: ', updatedUser))
        return updatedUser
    }
}

module.exports = {
    EconomicGroupUsersDao,
}
