'use strict'

const { BaseObject } = require('../../../commons/BaseObject'),
    { generateResponse, CREATED, GONE, UNPROCESSABLE_ENTITY, OK } = require('../../../commons/ResponseCreator'),
    StatusCodes = require('../../../commons/StatusCodes'),
    { EconomicGroupUsersService } = require('./EconomicGroupUsersService'),
    { UsersValidationsService } = require('../validations/UsersValidationsService'),
    { EconomicGroupService } = require('../EconomicGroupService'),
    { EconomicGroupUsersDao } = require('./EconomicGroupUsersDao'),
    { EconomicGroupDao } = require('../EconomicGroupDao'),
    Constants = require('../../../commons/Constants'),
    LOGGER = require('@com-banistmo/scg-ms-logs-node'),
    { Utils } = require('../../../commons/Utils')

class EconomicGroupUsersController extends BaseObject {
    static async create(traceID) {
        let economicGroupUsersController = new EconomicGroupUsersController(traceID)
        await economicGroupUsersController.initialize()
        return economicGroupUsersController
    }

    async initialize() {
        //Inicialización de DAOs
        let economicGroupUsersDao = new EconomicGroupUsersDao(this.traceID)
        await economicGroupUsersDao.initialize()
        let economicGroupDao = new EconomicGroupDao(this.traceID)
        await economicGroupDao.initialize()

        //Inicialización de servicios
        this.usersValidationsService = new UsersValidationsService(this.traceID, economicGroupDao)
        this.economicGroupService = new EconomicGroupService(this.traceID, economicGroupDao)
        this.economicGroupUsersService = new EconomicGroupUsersService(this.traceID, economicGroupUsersDao, this.economicGroupService)
    }

    /**
     * Ejecuta el reemplazo de usuario principal de un GE
     * @param {*} event
     */
    async replaceMainUser(event) {
        let tokenData = Utils.getTokenInfoFromEvent(event),
            eventBody = JSON.parse(event.body),
            usersFormated = []

        //Se debe consultar los datos básicos del GE para poder ejecutar las validaciones de usuario
        let economicGroupBasicData = await this.economicGroupService.getEconomicGroupDetail(eventBody.economicGroupId)
        let basicData = {
            name: economicGroupBasicData.name,
            adminApproval: economicGroupBasicData.administrative_approval_type,
            monetaryApproval: economicGroupBasicData.monetary_approval_type,
            segment: economicGroupBasicData.segment,
        }

        //Se debe consultar los usuarios ppales (actuales) del GE para poder ejecutar la validaciones de usuario
        let activeMainUsers = await this.economicGroupService.getEconomicGroupMainUsersByStatus(eventBody.economicGroupId, Constants.STATUS.ACTIVE)
        if (activeMainUsers && Array.isArray(activeMainUsers) && activeMainUsers.length > 0) {
            activeMainUsers.forEach((user) => {
                if (user.id !== eventBody.replacedUserId) {
                    usersFormated.push({
                        id: user.id,
                        identificationType: user.identificationType,
                        identificationNumber: user.identificationNumber,
                        userCountryExpedition: user.userCountryExpedition,
                        transactionsAccess: user.profile === Constants.PROFILES.PRINCIPAL_MONETARY,
                    })
                }
            })
        }
        //Ejecutar validaciones del usuario nuevo
        usersFormated.push(eventBody.newUser)
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGCU001', 'Usuarios formateados', 'Users:', usersFormated))
        let userValidations = await this.usersValidationsService.validations(usersFormated, basicData, eventBody.economicGroupId, false)
        if (userValidations && Array.isArray(userValidations) && userValidations.length > 0) {
            let responsePayload = {
                errors: {
                    users: userValidations,
                },
            }
            this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage('EGC009', 'Nuevo Usuario Ppal del Grupo Economico validado', 'ID: ', responsePayload))
            throw generateResponse(this.traceID, UNPROCESSABLE_ENTITY, StatusCodes.ECONOMIC_GROUP_UNIQUE_USER_VALIDATION, null, responsePayload)
        }
        //Después de superar la validaciones, se debe llamar a servicio de reeemplazo de usuario
        let updatedUser = await this.economicGroupUsersService.replaceMainUser(
            eventBody.economicGroupId,
            eventBody.replacedUserId,
            usersFormated[usersFormated.length - 1],
            event,
            tokenData
        )
        return generateResponse(this.traceID, OK, StatusCodes.SUCCESSFUL_OPERATION, null, updatedUser)
    }

    /**
     * Consulta los reemplazos de usuarios principales de GEs pendientes de aprobación
     * @param {*} event
     */
    async listPendingReplaceMainUser(event) {
        let eventQueryString = event.queryStringParameters || {}
        let filter = eventQueryString.filter
        let offset = eventQueryString.offset && !isNaN(eventQueryString.offset) ? Number(eventQueryString.offset) : 0
        let limit = eventQueryString.limit && !isNaN(eventQueryString.limit) ? Number(eventQueryString.limit) : 10
        let result = await this.economicGroupUsersService.listPendingReplaceMainUser(filter, offset, limit)
        return generateResponse(
            this.traceID,
            OK,
            StatusCodes.SUCCESSFUL_OPERATION,
            null,
            Utils.generatePaginatedResponse(offset, limit, result.total, result.users)
        )
    }

    /**
     * Consulta los reemplazos de usuarios principales de GEs pendientes de aprobación
     * @param {*} event
     */
    async approveRejectReplaceMainUser(event) {
        let eventBody = JSON.parse(event.body);
        let tokenData = Utils.getTokenInfoFromEvent(event);
        let approveReject = await this.economicGroupUsersService.approveRejectReplaceMainUser(eventBody, event, tokenData)
        return generateResponse(this.traceID, OK, StatusCodes.SUCCESSFUL_OPERATION, null, approveReject)
    }
}

module.exports = {
    EconomicGroupUsersController,
}
