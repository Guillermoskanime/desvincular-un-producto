'use strict';

const { BaseObject } = require('../../../commons/BaseObject'),
    { generateResponse, INTERNAL_SERVER_ERROR, CONFLICT } = require('../../../commons/ResponseCreator'),
    { UsersRegistrationLambdaProvider } = require('../../../commons/AWS/Lambda/UsersRegistration/UsersRegistrationLambdaProvider'),
    { ADMEmpresasLambdaProvider } = require('../../../commons/AWS/Lambda/ADMEmpresas/ADMEmpresasLambdaProvider'),
    { DetectIDLambdaProvider } = require('../../../commons/AWS/Lambda/DetectID/DetectIDLambdaProvider'),
    StatusCodes = require('../../../commons/StatusCodes'),
    { Utils } = require('../../../commons/Utils'),
    LOGGER = require('@com-banistmo/scg-ms-logs-node'),
    { AuditProvider } = require('../../../commons/AWS/SNS/audit/AuditProvider'),
    Constants = require('../../../commons/Constants');

class EconomicGroupUsersService extends BaseObject {
    constructor(traceID, economicGroupUsersDao, economicGroupService) {
        super(traceID);
        this.economicGroupUsersDao = economicGroupUsersDao;
        this.economicGroupService = economicGroupService;
        this.usersRegistrationLambdaProvider = new UsersRegistrationLambdaProvider(this.traceID);
        this.aDMEmpresasLambdaProvider = new ADMEmpresasLambdaProvider(this.traceID);
        this.detectIDLambdaProvider = new DetectIDLambdaProvider(this.traceID);
    }

    /**
     * Metodo encargado del reemplazo de usuarios principales
     * @param {*} economicGroupID
     * @param {*} replacedUserId
     * @param {*} newUser
     * @param {*} event
     * @param {*} tokenData
     */
    async replaceMainUser(economicGroupID, replacedUserId, newUser, event, tokenData) {
        try {
            //Se obtienen estados
            this.LOG.logging(
                LOGGER.LEVEL_INFO,
                LOGGER.buildAnyMessage('EGSU001', 'Se procede a obtener id de estados', 'Data: ', {
                    approved: Constants.STATUS.PENDING_APPROVAL,
                })
            );
            let status = await Promise.all([this.economicGroupUsersDao.getStatusByAbbreviature(Constants.STATUS.PENDING_APPROVAL)]);
            this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage('EGSU002', 'Estados obtenidos', 'Data: ', status));

            //Se obtiene información del usuario a remplazarse
            let replacedUser = await this.economicGroupUsersDao.getUserNonTmp(replacedUserId);

            //Se guarda usuario nuevo en tabla temporal
            await this.economicGroupUsersDao.saveUserTmp(newUser, status[0][0].id, economicGroupID, replacedUser.rolId, replacedUserId);
            this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage('EGSU003', 'Usuario creado', 'Data: ', newUser));

            //Se registra en auditoria
            let auditProvider = new AuditProvider(this.traceID, replacedUserId);
            await auditProvider.sendReplaceUserAuditMessage(event, replacedUserId);

            return newUser;
        } catch (error) {
            this.LOG.logging(
                LOGGER.LEVEL_ERROR,
                LOGGER.buildAnyMessage(
                    'EGSU004',
                    'Error guardando usuario principal del Grupo Economico para aprobación',
                    error.toString(),
                    Utils.stringifyError(error)
                )
            );
            throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_REPLACE_MAIN_USER_ERROR);
        }
    }

    remapUserToCreation(user) {
        return {
            economicGroupId: user.economicGroupId.toString(),
            identificationType: user.idType,
            identificationNumber: user.idNumber,
            documentIssuingCountry: user.countryExpedition,
            name: user.name,
            lastName: user.lastName,
            email: user.email,
            mobile: user.mobile,
            countryCodeMobile: user.countryCodeMobile,
            transactionsAccess: user.hasTransactionAccess,
        };
    }

    /**
     * Método encargado de actualizar los estados del usuario eliminado y del recien creado
     * @param {*} economicGroupID
     * @param {*} createdUserId
     * @param {*} replacedUserId
     * @param {*} statusArray
     */
    async updateUsersStatus(economicGroupID, user, status, updateUser) {
        //Se actualiza estado de usuarios
        this.LOG.logging(
            LOGGER.LEVEL_INFO,
            LOGGER.buildAnyMessage('EGSU005', 'Se procede a actualizar estados de usuarios', 'Data: ', {
                economicGroupID,
                user,
                status,
            })
        );
        await this.economicGroupUsersDao.updateUserStatus(economicGroupID, user, status, updateUser);
        const updatedUser = await this.economicGroupUsersDao.getUserNonTmp(user);
        this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage('EGSU006', 'Usuarios actualizados', 'Usuarios actualizados', updatedUser));
        return updatedUser;
    }

    async createUser(economicGroupID, newUser, event, tokenData) {
        //Se crea usuario nuevo
        this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage('EGSU007', 'Se procede a crear usuario', 'Data: ', { economicGroupID, newUser, tokenData }));
        const createdUser = await this.usersRegistrationLambdaProvider.createEGPrincipalUser(newUser, event, true);
        this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage('EGSU008', 'Nuevo usuario principal creado', 'Nuevo usuario principal creado', createdUser));
        await this.economicGroupService.activateMainUsers(event.headers, economicGroupID, tokenData.sub);
        this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage('EGSU009', 'Activación exitosa', 'Usuarios actualizados', {}));
        return createdUser;
    }

    async listPendingReplaceMainUser(filter, offset, limit) {
        return await this.economicGroupUsersDao.getPendingReplaceMainUser(filter, offset, limit);
    }

    async approveRejectReplaceMainUser(body, event, tokenData) {
        let status = body.status;
        let userId = body.userId;
        let userTemp = await this.economicGroupUsersDao.getUserTemp(userId);
        let newUser, statusIds;
        let auditProvider = new AuditProvider(this.traceID, userId);
        if (status === Constants.STATUS.APPROVED) {
            let deletedUser;
            try {
                //Se obtienen estados
                this.LOG.logging(
                    LOGGER.LEVEL_INFO,
                    LOGGER.buildAnyMessage('EGSU010', 'Se procede a obtener id de estados', 'Data: ', {
                        approved: Constants.STATUS.APPROVED,
                        deleted: Constants.STATUS.DELETED,
                    })
                );
                statusIds = await Promise.all([
                    this.economicGroupUsersDao.getStatusByAbbreviature(Constants.STATUS.APPROVED),
                    this.economicGroupUsersDao.getStatusByAbbreviature(Constants.STATUS.INACTIVE),
                    this.economicGroupUsersDao.getStatusByAbbreviature(Constants.STATUS.DELETED),
                ]);
                this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage('EGSU011', 'Estados obtenidos', 'Data: ', statusIds));
                //Se remapea para enviar a creación
                newUser = this.remapUserToCreation(userTemp);
                deletedUser = await this.updateUsersStatus(newUser.economicGroupId, userTemp.userId, statusIds[1][0].id, tokenData.sub);
                this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage('EGSU012', 'Usuario eliminado', 'Data: ', deletedUser));
            } catch (error) {
                this.LOG.logging(
                    LOGGER.LEVEL_ERROR,
                    LOGGER.buildAnyMessage(
                        'EGSU013',
                        'Error reemplazando un usuario principal del Grupo Economico',
                        error.toString(),
                        Utils.stringifyError(error)
                    )
                );
                throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_REPLACE_MAIN_USER_ERROR);
            }
            try {
                await this.createUser(newUser.economicGroupId, newUser, event, tokenData);
                await this.economicGroupUsersDao.updateUser(userTemp.id, statusIds[1][0].id, tokenData.sub);
            } catch (error) {
                this.LOG.logging(
                    LOGGER.LEVEL_ERROR,
                    LOGGER.buildAnyMessage('EGSU014', 'Error en la creacion de usuarios', error.toString(), Utils.stringifyError(error))
                );
                throw generateResponse(this.traceID, CONFLICT, StatusCodes.ECONOMIC_GROUP_CREATION_USER_ERROR);
            }
            try {
                //Se bloquea en ADM el usuario a eliminar
                this.LOG.logging(
                    LOGGER.LEVEL_INFO,
                    LOGGER.buildAnyMessage('EGSU015', 'Se procede a cambiar estado a bloqueado en adm', 'Data: ', {
                        user: deletedUser,
                        tokenData,
                        locked: Constants.ADM_STATUS.INACTIVE,
                    })
                );
                await this.aDMEmpresasLambdaProvider.changeStatusUser(
                    this.traceID,
                    deletedUser.username,
                    Constants.ADM_STATUS.INACTIVE,
                    tokenData.aud,
                    event
                );
                if (deletedUser.username) {
                    //Se elimina semilla en Cyxtera
                    await this.detectIDLambdaProvider.deleteSeed(deletedUser.username, event.headers);
                }
                await auditProvider.sendApproveUserAuditMessage(event, userId);
                return newUser;
            } catch (error) {
                this.LOG.logging(
                    LOGGER.LEVEL_ERROR,
                    LOGGER.buildAnyMessage('EGSU016', 'Error en servicios externos ADM o detectId', error.toString(), Utils.stringifyError(error))
                );
                throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_REPLACE_MAIN_USER_ERROR);
            }
        } else {
            try {
                //Se obtienen estados
                this.LOG.logging(
                    LOGGER.LEVEL_INFO,
                    LOGGER.buildAnyMessage('EGSU017', 'Se procede a obtener id de estados', 'Data: ', {
                        approved: Constants.STATUS.REJECTED,
                    })
                );
                statusIds = await Promise.all([this.economicGroupUsersDao.getStatusByAbbreviature(Constants.STATUS.REJECTED)]);
                this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage('EGSU018', 'Estados obtenidos', 'Data: ', status));

                let userReject = await this.economicGroupUsersDao.updateUser(userTemp.id, statusIds[0][0].id, tokenData.sub);

                this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage('EGSU019', 'Usuario rechazado', 'Data: ', userReject));

                await auditProvider.sendRejectUserAuditMessage(event, userId);

                return userReject;
            } catch (error) {
                this.LOG.logging(
                    LOGGER.LEVEL_ERROR,
                    LOGGER.buildAnyMessage(
                        'EGSU020',
                        'Error reemplazando un usuario principal del Grupo Economico',
                        error.toString(),
                        Utils.stringifyError(error)
                    )
                );
                throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_REPLACE_MAIN_USER_ERROR);
            }
        }
    }
}

module.exports = {
    EconomicGroupUsersService,
};
