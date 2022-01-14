'use strict';

const { BaseDAO } = require('../../commons/db/dao/BaseDAO'),
    { StatusDTO } = require('../../commons/db/dto/StatusDTO'),
    LOGGER = require('@com-banistmo/scg-ms-logs-node'),
    Sequelize = require('sequelize'),
    Constants = require('../../commons/Constants'),
    { EnterpriseRolesLambdaProvider } = require('../../commons/AWS/Lambda/EnterpriseRoles/EnterpriseRolesLambdaProvider'),
    { EconomicGroupDTO } = require('../../commons/db/dto/EconomicGroupDTO'),
    { UsersEnterprisesDTO } = require('../../commons/db/dto/UsersEnterprisesDTO'),
    { ApprovalFlowProductsDTO } = require('../../commons/db/dto/ApprovalFlowProductsDTO'),
    { ApprovalFlowDTO } = require('../../commons/db/dto/ApprovalFlowDTO'),
    { VIEconomicGroupDTO } = require('../../commons/db/dto/VIEconomicGroupDTO'),
    { VIEconomicGroupUsersDTO } = require('../../commons/db/dto/VIEconomicGroupUsersDTO'),
    { VISVETransactionsPAPGDTO } = require('../../commons/db/dto/VISVETransactionsPAPGDTO'),
    { TmpEconomicGroupDTO } = require('../../commons/db/dto/tmp_dto/TmpEconomicGroupDTO'),
    { EconomicGroupTransactionLimitsDao } = require('./transaction-limits/EconomicGroupTransactionLimitsDao'),
    { EconomicGroupProductsDao } = require('./products/EconomicGroupProductsDao'),
    { EconomicGroupCommissionDao } = require('./comissions/EconomicGroupCommissionDao'),
    { TmpUsersEnterprisesDTO } = require('../../commons/db/dto/tmp_dto/TmpUserEnterprisesDTO'),
    { AuditProvider } = require('../../commons/AWS/SNS/audit/AuditProvider');
class EconomicGroupDao extends BaseDAO {
    constructor(traceID) {
        super(traceID);
        this.database = Constants.DATABASE.DB_SVE_SCHEMA;
        this.economicGroupTransactionLimitsDao = new EconomicGroupTransactionLimitsDao(traceID);
        this.economicGroupProductsDao = new EconomicGroupProductsDao(traceID);
        this.economicGroupCommissionDao = new EconomicGroupCommissionDao(traceID);
    }

    async createEconomicGroup(name, administrativeApprovalType, monetaryApprovalType, segment, userCreation) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD001', 'Inicializando Modelos'));
        let economicGroupDTO = new EconomicGroupDTO(this.traceID, this.connection);
        let inConstructionState = await this.getStatusByAbbreviation(Constants.STATUS.IN_CONSTRUCTION);
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD004', 'Creando Grupo Economico'));
        let newEconomicGroup = await economicGroupDTO.model.create({
            name: name,
            administrativeApprovalType: administrativeApprovalType,
            monetaryApprovalType: monetaryApprovalType,
            segment: segment,
            creationUser: userCreation,
            lastModificationUser: userCreation,
            approveStateId: inConstructionState.dataValues.id,
            creationStage: 0,
        });
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD005', 'Grupo Economico Creado', 'Grupo Economico:', JSON.stringify(newEconomicGroup)));
        return newEconomicGroup.id;
    }

    getEconomicGroupDetail(economicGroupID) {
        return new Promise((resolve, reject) => {
            this.connection
                .query(Constants.SQL.PROCEDURES.GET_ECONOMIC_GROUP_DETAIL, {
                    type: Sequelize.QueryTypes.SELECT,
                    raw: true,
                    bind: {
                        economicGroupID: economicGroupID,
                    },
                })
                .spread((result) => resolve(result[0]))
                .catch((error) => reject(error));
        });
    }

    /**
     * APROBACION_GE
     * Consulta el detalle del GE actualizado, pendiente de aprobación
     * @param {Number} economicGroupID
     */
    getEconomicGroupDetailTmp(economicGroupID) {
        return new Promise((resolve, reject) => {
            this.connection
                .query(Constants.SQL.PROCEDURES.GET_ECONOMIC_GROUP_DETAIL_TMP, {
                    type: Sequelize.QueryTypes.SELECT,
                    raw: true,
                    bind: {
                        economicGroupID: economicGroupID,
                    },
                })
                .spread((result) => resolve(result[0]))
                .catch((error) => reject(error));
        });
    }

    /**
     * APROBACION_GE
     * Aprobación o rechazo de un GE actualizado
     * @param {Number} economicGroupID
     */
    approveRejectEconomicGroup(economicGroupID, decision, approver, transaction) {
        return new Promise((resolve, reject) => {
            this.connection
                .query(Constants.SQL.PROCEDURES.APPROVE_REJECT_UPDATED_ECONOMIC_GROUP, {
                    userMaster: true,
                    type: Sequelize.QueryTypes.SELECT,
                    raw: true,
                    bind: {
                        economicGroupID: economicGroupID,
                        decision: decision,
                        approver: approver,
                    },
                    transaction: transaction,
                })
                .spread((result) => resolve(result[0]))
                .catch((error) => reject(error));
        });
    }

    /**
     * APROBACION_GE
     * Inactivación de un GE
     * @param {Number} economicGroupID
     */
    inactivateEconomicGroup(economicGroupID, user, transaction) {
        return new Promise((resolve, reject) => {
            this.connection
                .query(Constants.SQL.PROCEDURES.INACTIVATE_ECONOMIC_GROUP, {
                    userMaster: true,
                    type: Sequelize.QueryTypes.SELECT,
                    raw: true,
                    bind: {
                        economicGroupID: economicGroupID,
                    },
                    transaction: transaction,
                })
                .spread((result) => resolve(result[0]))
                .catch((error) => reject(error));
        });
    }

    async updateEconomicGroup(economicGroupID, name, administrativeApprovalType, monetaryApprovalType, segment, userModification) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD006', 'Inicializando Modelos'));
        let economicGroupDTO = new EconomicGroupDTO(this.traceID, this.connection);
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD007', 'Actualizando Grupo Economico'));
        let updatedEconomicGroup = await economicGroupDTO.model.update(
            {
                name: name,
                administrativeApprovalType: administrativeApprovalType,
                monetaryApprovalType: monetaryApprovalType,
                segment: segment,
                lastModificationUser: userModification,
                lastModificationDate: Date.now(),
            },
            {
                where: {
                    id: economicGroupID,
                },
            }
        );
        this.LOG.logging(
            LOGGER.LEVEL_DEBUG,
            LOGGER.buildAnyMessage('EGD008', 'Grupo Economico Actualizado', 'Grupo Economico:', JSON.stringify(updatedEconomicGroup))
        );
        return updatedEconomicGroup;
    }

    async setEconomicGroupTrxCommissions(economicGroupID) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD031', 'Creando economic group transaccion comissions', 'EconomicGroupID', economicGroupID));
        let commissions = await this.connection.query(Constants.SQL.PROCEDURES.SP_VALIDATE_EXIST_COMISSIONS, {
            bind: {
                economicGroupId: economicGroupID,
            },
            type: Sequelize.QueryTypes.RAW,
        });
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD011', 'Commissions Encontrados', 'Comissions', commissions));
        return commissions;
    }

    async setEconomicGroupStatus(economicGroupID, status, userModification, transaction) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD0012', 'Inicializando Modelos'));
        let economicGroupDTO = new EconomicGroupDTO(this.traceID, this.connection);
        let activeState = await this.getStatusByAbbreviation(status);
        let options = {
            where: {
                id: economicGroupID,
            },
        };
        if (transaction) {
            options.transaction = transaction;
        }
        await economicGroupDTO.model.update(
            {
                approveStateId: activeState.dataValues.id,
                lastModificationUser: userModification,
                lastModificationDate: Date.now(),
            },
            options
        );
        this.LOG.logging(
            LOGGER.LEVEL_DEBUG,
            LOGGER.buildAnyMessage('EGD013', 'Grupo Economico Estado Actualizado', 'Grupo Economico::Estado', `${JSON.stringify(economicGroupID)}::${status}`)
        );
        return true;
    }

    async getStatusByAbbreviation(status) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD009', 'Inicializando Modelos'));
        let statusDTO = new StatusDTO(this.traceID, this.connection);
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD010', 'Buscando Estado', 'Estado', JSON.stringify(status)));
        let inConstructionStates = await this.connection.query(Constants.SQL.PROCEDURES.GET_STATUS_BY_ABBREVIATION, {
            bind: {
                abbreviation: status,
            },
            model: statusDTO.model,
            mapToModel: true,
            type: Sequelize.QueryTypes.SELECT,
        });
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD011', 'Estados Encontrados', 'Estados', JSON.stringify(inConstructionStates)));
        if (!inConstructionStates || (Array.isArray(inConstructionStates) && (inConstructionStates.length !== 2 || inConstructionStates[0].length !== 1))) {
            throw new Error('Estado en Construccion no encontrado o se encontro mas de uno');
        }
        return inConstructionStates[0][0];
    }

    async getEconomicGroups(offset, limit, filter, states) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD012', 'Inicializando Modelos'));
        let viEconomicGroupDTO = new VIEconomicGroupDTO(this.traceID, this.connection);
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD014', 'Buscando Grupos Economicos'));
        let options = {
            attributes: [
                'id',
                'name',
                'status',
                'monetaryApprovalType',
                'administrativeApprovalType',
                'segment',
                'creationStage',
                'creationDate',
                'lastModificationDate',
            ],
        };
        if (offset !== undefined && limit !== undefined) {
            options.offset = parseInt(offset, 10) || 0;
            options.limit = parseInt(limit, 10) || 50;
        }
        if (filter || states) {
            options.where = {};
            if (filter) {
                options.where = {
                    [Sequelize.Op.or]: [
                        {
                            name: {
                                [Sequelize.Op.like]: `%${filter}%`,
                            },
                        },
                        {
                            id: {
                                [Sequelize.Op.like]: `%${filter}%`,
                            },
                        },
                    ],
                };
            }
            if (states && Array.isArray(states) && states.length > 0) {
                options.where.status = {
                    [Sequelize.Op.in]: states,
                };
            }
        }
        options.order = [['id', 'DESC']];
        let economicGroups = await viEconomicGroupDTO.model.findAndCountAll(options);
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD015', 'Grupos Encontrados', 'Grupos', JSON.stringify(economicGroups)));
        return economicGroups;
    }

    async getEconomicGroupMainUsersByStatus(economicGroupID, status) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD016', 'Inicializando Modelos'));
        let viEconomicGroupUsersDTO = new VIEconomicGroupUsersDTO(this.traceID, this.connection);
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD017', 'Buscando Usuarios Principales', 'Estado', status));
        let options = {
            where: {
                economicGroupId: economicGroupID,
                profile: {
                    [Sequelize.Op.in]: [Constants.PROFILES.PRINCIPAL_ADMIN, Constants.PROFILES.PRINCIPAL_MONETARY],
                },
            },
        };
        if (status) {
            options.where.status = status;
        }
        let mainUsers = await viEconomicGroupUsersDTO.model.findAll(options);
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD018', 'Usuarios Encontrados', 'Usuarios', JSON.stringify(mainUsers)));
        return mainUsers;
    }

    async getEconomicGroupByName(economicGroupName, economicGroupId) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD019', 'Inicializando Modelos'));
        let economicGroupDTO = new EconomicGroupDTO(this.traceID, this.connection);
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD020', 'Buscando grupo economico', 'Nombre', economicGroupName));
        let options = {
            where: {
                name: economicGroupName,
            },
        };
        if (economicGroupId) {
            options.where.id = { [Sequelize.Op.ne]: economicGroupId };
        }
        let economicGroupCount = await economicGroupDTO.model.findAndCountAll(options);
        this.LOG.logging(
            LOGGER.LEVEL_DEBUG,
            LOGGER.buildAnyMessage('EGD021', 'Número de Grupos económicos Encontrados', 'GE', JSON.stringify(economicGroupCount))
        );
        return economicGroupCount;
    }

    async getTempEconomicGroupByName(economicGroupName, economicGroupId) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD022', 'Inicializando Modelos'));
        let tmpEconomicGroupDTO = new TmpEconomicGroupDTO(this.traceID, this.connection);
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD023', 'Buscando grupo economico', 'Nombre', economicGroupName));
        let options = {
            where: {
                name: economicGroupName,
            },
        };
        if (economicGroupId) {
            options.where.id = { [Sequelize.Op.ne]: economicGroupId };
        }
        let tmpEconomicGroupCount = await tmpEconomicGroupDTO.model.findAndCountAll(options);
        this.LOG.logging(
            LOGGER.LEVEL_DEBUG,
            LOGGER.buildAnyMessage('EGD024', 'Número de Grupos económicos encontrados en TempEconomicGroup', 'GE', JSON.stringify(tmpEconomicGroupCount))
        );
        return tmpEconomicGroupCount;
    }

    async setUserStatus(userID, status, userModification) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD0025', 'Inicializando Modelos'));
        let usersEnterprisesDTO = new UsersEnterprisesDTO(this.traceID, this.connection);
        let activeState = await this.getStatusByAbbreviation(status);
        await usersEnterprisesDTO.model.update(
            {
                statusID: activeState.dataValues.id,
                lastModificationUser: userModification,
                lastModificationDate: Date.now(),
            },
            {
                where: {
                    id: userID,
                },
            }
        );
        this.LOG.logging(
            LOGGER.LEVEL_DEBUG,
            LOGGER.buildAnyMessage('EGD026', 'Usuario Estado Actualizado', 'Usuario::Estado', `${JSON.stringify(userID)}::${status}`)
        );
    }

    async mainUpdateEconomicGroupFromActive(body, user, headers, event) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD020', 'Actualización grupo economico de activo', 'data: ', { body, user }));
        const insertPromises = [];
        let transaction = null;
        //Objeto de banderas para saber a que entidad se le hará copia
        let copyFlags = { basic: true, limits: true, enterprises: true, commissions: true, users: true };
        let auditProvider = new AuditProvider(this.traceID, body.economicGroupId);
        try {
            //Se inicia el espacio transaccional
            transaction = await this.connection.transaction({
                autocommit: false,
                isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
            });
            if (body.basicData) {
                insertPromises.push(this.insertIntoBasicDataTmpEG(body.basicData, body.economicGroupId, body.status, user, copyFlags, transaction));
            }
            if (body.limits) {
                await auditProvider.sendUpdateLimitsAuditMessage(event, body.economicGroupId);
                await this.economicGroupTransactionLimitsDao.initialize();
                insertPromises.push(
                    this.economicGroupTransactionLimitsDao.insertIntoLimitsTmp(body.limits, body.economicGroupId, user, copyFlags, transaction)
                );
            }
            if (body.enterprises && body.products) {
			    await auditProvider.sendUpdateEnterpriseAndProductsAuditMessage(event, body.economicGroupId);
                await this.economicGroupProductsDao.initialize();
                insertPromises.push(
                    this.economicGroupProductsDao.insertIntoEnterpriseTmp(body.enterprises, body.products, body.economicGroupId, user, copyFlags, transaction)
                );
            }
            if (body.commissions) {
                await this.economicGroupCommissionDao.initialize();
                insertPromises.push(
                    this.economicGroupCommissionDao.insertIntoCommissionTmp(body.commissions, body.economicGroupId, user, copyFlags, transaction)
                );
            }
            if (body.users) {
                insertPromises.push(this.insertIntoUsersEnterprisesTmpEG(body.users, body.economicGroupId, body.status, user, copyFlags, transaction, headers));
            }
            await Promise.all(insertPromises);
            //Se debe copiar imagen del grupo economico con las partes que no se actualizaron y se actualiza el estado del grupo
            await this.copyEGImage(body.economicGroupId, body.newStatus, user, copyFlags, transaction);

            /**
             * Si el nuevo estado del GE es Pdnte de Aprobación (viene de estado Rechazado) se debe pasar la información de las tablas tmp a las ppales
             * Esto debido a que en el proceso de aprobación, para GE Pdtes de Aprobación se toma la info de las tablas ppales
             */
            if (body.newStatus === Constants.STATUS.PENDING_APPROVAL) {
                await this.copyTmpIntoPpal(body.economicGroupId, user, transaction);
            }
            await transaction.commit();
            return body.economicGroupId;
        } catch (error) {
            if (transaction) {
                transaction.rollback();
            }
            throw error;
        }
    }

    async mainUpdateEconomicGroupFromRejected(body, user, headers) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD020', 'Actualización grupo economico de rechazado', 'data: ', { body, user }));
        const insertPromises = [];
        let transaction = null;
        //Objeto de banderas para saber a que entidad se le hará copia
        let copyFlags = { basic: false, limits: false, enterprises: false, commissions: false, users: false };
        try {
            //Se inicia el espacio transaccional
            transaction = await this.connection.transaction({
                autocommit: false,
                isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
            });
            if (body.basicData) {
                insertPromises.push(this.insertIntoBasicDataEG(body.basicData, body.economicGroupId, body.newStatus, user, copyFlags, transaction));
            }
            if (body.limits) {
                await this.economicGroupTransactionLimitsDao.initialize();
                insertPromises.push(this.economicGroupTransactionLimitsDao.insertIntoLimits(body.limits, body.economicGroupId, user, copyFlags, transaction));
            }
            if (body.enterprises && body.products) {
                await this.economicGroupProductsDao.initialize();
                insertPromises.push(
                    this.economicGroupProductsDao.insertIntoEnterprise(body.enterprises, body.products, body.economicGroupId, user, copyFlags, transaction)
                );
            }
            if (body.users) {
                insertPromises.push(this.insertIntoUsersEnterprisesEG(body.users, body.economicGroupId, body.status, user, copyFlags, transaction, headers));
            }
            await Promise.all(insertPromises);

            if (body.commissions) {
                await this.economicGroupCommissionDao.initialize();
                await this.economicGroupCommissionDao.insertIntoCommission(body.commissions, body.economicGroupId, user, copyFlags, transaction);
            }
            //Se debe copiar imagen del grupo economico con las partes que no se actualizaron y se actualiza el estado del grupo
            await this.copyEGImage(body.economicGroupId, body.newStatus, user, copyFlags, transaction);

            await transaction.commit();
            return body.economicGroupId;
        } catch (error) {
            if (transaction) {
                transaction.rollback();
            }
            throw error;
        }
    }

    async copyEGImage(economicGroupId, newStatus, user, copyFlags, transaction) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD020', 'Copiando imagen del grupo economico', 'data: ', { economicGroupId, newStatus }));
        let result = await this.connection.query(Constants.SQL.PROCEDURES.COPY_ECONOMIC_GROUP_IMAGE_INTO_TMP_SP, {
            userMaster: true,
            bind: {
                economicGroupID: economicGroupId,
                newStatus: newStatus,
                user: user,
                basicFlag: copyFlags.basic,
                limitsFlag: copyFlags.limits,
                enterprisesFlag: copyFlags.enterprises,
                commissionsFlag: copyFlags.commissions,
                usersFlag: copyFlags.users,
            },
            transaction: transaction,
            raw: true,
        });
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD020', 'Copia exitosa', 'data: ', { result }));
    }

    async copyTmpIntoPpal(economicGroupId, user, transaction) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD020', 'Copiando tablas tmp en tablas ppales', 'data: ', { economicGroupId, user }));
        let result = await this.connection.query(Constants.SQL.PROCEDURES.COPY_ECONOMIC_GROUP_TMP_INTO_PPAL_SP, {
            userMaster: true,
            bind: {
                economicGroupID: economicGroupId,
                user: user,
            },
            transaction: transaction,
            raw: true,
        });
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD020', 'Copia exitosa de tablas tmp a tablas ppales', 'data: ', { result }));
    }

    async insertIntoBasicDataTmpEG(basicData, economicGroupId, oldStatus, user, copyFlags, transaction) {
        this.LOG.logging(
            LOGGER.LEVEL_DEBUG,
            LOGGER.buildAnyMessage('EGD020', 'Inicializando Modelos', 'data: ', { basicData, economicGroupId, oldStatus, user, copyFlags })
        );
        //Se inicializa conexion si no existe
        await this.initialize();
        //Se inicializa modelo de datos basicos
        let tmpEconomicGroupDTO = new TmpEconomicGroupDTO(this.traceID, this.connection);
        //Se obtiene ids de los estados
        let oldStatusId = await this.getStatusByAbbreviation(oldStatus);
        //Se crea grupo economico en la tabla temporal
        const economicGroup = await tmpEconomicGroupDTO.model.create(
            {
                id: economicGroupId,
                name: basicData.name,
                administrativeApprovalType: basicData.adminApproval,
                monetaryApprovalType: basicData.monetaryApproval,
                segment: basicData.segment,
                previousStateId: oldStatusId.id,
                lastModificationUser: user,
                lastModificationDate: Date.now(),
            },
            {
                transaction: transaction,
            }
        );
        this.LOG.logging(
            LOGGER.LEVEL_DEBUG,
            LOGGER.buildAnyMessage(
                'EGD021',
                'Datos basicos de grupo economico temporal creados',
                'EG::Estado',
                `${JSON.stringify(economicGroup)}::${oldStatus}`
            )
        );
        //Se indica de que no se debe hacer copia de datos basicos
        copyFlags.basic = false;
    }

    async insertIntoBasicDataEG(basicData, economicGroupId, newStatus, user, copyFlags, transaction) {
        this.LOG.logging(
            LOGGER.LEVEL_DEBUG,
            LOGGER.buildAnyMessage('EGD050', 'Inicializando Modelos', 'data: ', { basicData, economicGroupId, newStatus, user, copyFlags })
        );
        //Se inicializa conexion si no existe
        await this.initialize();
        //Se inicializa modelo de datos basicos
        let economicGroupDTO = new EconomicGroupDTO(this.traceID, this.connection);
        //Se obtiene ids de los estados
        let newStatusId = await this.getStatusByAbbreviation(newStatus);
        //Se actualiza grupo economico en la tabla oficial
        const economicGroup = await economicGroupDTO.model.upsert(
            {
                id: economicGroupId,
                name: basicData.name,
                administrativeApprovalType: basicData.adminApproval,
                monetaryApprovalType: basicData.monetaryApproval,
                segment: basicData.segment,
                approveStateId: newStatusId.id,
                lastModificationUser: user,
                lastModificationDate: Date.now(),
            },
            {
                transaction: transaction,
            }
        );
        this.LOG.logging(
            LOGGER.LEVEL_DEBUG,
            LOGGER.buildAnyMessage('EGD051', 'Datos basicos de grupo economico actualizados', 'EG::Estado', `${JSON.stringify(economicGroup)}::${newStatus}`)
        );
        //Se indica de que no se debe hacer copia de datos basicos
        copyFlags.basic = false;
    }

    async insertIntoUsersEnterprisesTmpEG(users, economicGroupId, oldStatus, user, copyFlags, transaction, headers) {
        this.LOG.logging(
            LOGGER.LEVEL_DEBUG,
            LOGGER.buildAnyMessage('EGD020', 'Inicializando Modelos', 'data: ', { users, economicGroupId, oldStatus, user, copyFlags })
        );
        //Se inicializa conexion si no existe
        await this.initialize();
        //Se inicializa modelo de datos basicos
        let tmpUsersEnterprisesDTO = new TmpUsersEnterprisesDTO(this.traceID, this.connection);
        //Se remapea el array de productos para hacer un bulk
        const usersArray = [];
        for (let i = 0; i < users.length; i++) {
            //Si hubo cambio en el acceso a transacciones
            if (users[i].isChanged) {
                let baseProfileIndicator;
                if (users[i].transactionsAccess) {
                    baseProfileIndicator = 'MONETARY';
                } else {
                    baseProfileIndicator = 'ADMINISTRATIVE';
                }
                let enterpriseRolesLambdaProvider = new EnterpriseRolesLambdaProvider(this.traceID);
                let roleResult = await enterpriseRolesLambdaProvider.getDefaultRolesIds(headers, economicGroupId, baseProfileIndicator);
                const parsedResult = JSON.parse(roleResult.body['@roleIdName']);
                users[i].roleId = parsedResult.roleId;
            }
            usersArray.push({
                userId: users[i].id,
                idType: users[i].identificationType,
                idNumber: users[i].identificationNumber,
                name: users[i].userName,
                lastName: users[i].userLastName,
                mobile: users[i].mobile,
                countryCodeMobile: users[i].countryCodeMobile,
                countryExpedition: users[i].userCountryExpedition,
                email: users[i].userEmail,
                rolId: users[i].roleId,
                statusIdNew: 4,
                statusOld: 4,
                economicGroupId: economicGroupId,
                updateUser: user,
                hasTransactionAccess: users[i].transactionsAccess,
            });
        }
        //Se insertan productos en tablas temporales
        await tmpUsersEnterprisesDTO.model.bulkCreate(usersArray, { transaction: transaction });
        copyFlags.users = false;
    }

    async insertIntoUsersEnterprisesEG(users, economicGroupId, oldStatus, user, copyFlags, transaction, headers) {
        this.LOG.logging(
            LOGGER.LEVEL_DEBUG,
            LOGGER.buildAnyMessage('EGD020', 'Inicializando Modelos', 'data: ', { users, economicGroupId, oldStatus, user, copyFlags })
        );
        //Se inicializa conexion si no existe
        await this.initialize();
        //Se inicializa modelo de datos basicos
        let usersEnterprisesDTO = new UsersEnterprisesDTO(this.traceID, this.connection);
        //Se remapea el array de productos para hacer un bulk
        const usersArray = [];
        for (let i = 0; i < users.length; i++) {
            //Si hubo cambio en el acceso a transacciones
            if (users[i].isChanged) {
                let baseProfileIndicator;
                if (users[i].transactionsAccess) {
                    baseProfileIndicator = 'MONETARY';
                } else {
                    baseProfileIndicator = 'ADMINISTRATIVE';
                }
                let enterpriseRolesLambdaProvider = new EnterpriseRolesLambdaProvider(this.traceID);
                let roleResult = await enterpriseRolesLambdaProvider.getDefaultRolesIds(headers, economicGroupId, baseProfileIndicator);
                const parsedResult = JSON.parse(roleResult.body['@roleIdName']);
                users[i].roleId = parsedResult.roleId;
            }
            usersArray.push({
                id: users[i].id,
                identificationType: users[i].identificationType,
                identificationNumber: users[i].identificationNumber,
                name: users[i].userName,
                lastName: users[i].userLastName,
                countryExpedition: users[i].userCountryExpedition,
                email: users[i].userEmail,
                rolId: users[i].roleId,
                statusID: 4,
                economicGroupId: economicGroupId,
                mobile: users[i].mobile,
                countryCodeMobile: users[i].countryCodeMobile,
                lastModificationUser: user,
            });
        }
        //Se insertan productos en tablas temporales
        await usersEnterprisesDTO.model.bulkCreate(usersArray, { updateOnDuplicate: ['id','identificationType','identificationNumber','name','lastName','countryExpedition','email','rolId','statusID','economicGroupId','lastModificationUser','mobile','countryCodeMobile'], transaction: transaction });
        copyFlags.users = false;
    }

    async getEconomicGroupTmpUsers(economicGroupID) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD020', 'Inicializando Modelos', 'data: ', { economicGroupID }));
        //Se inicializa conexion si no existe
        await this.initialize();
        //Se inicializa modelo de datos basicos
        let tmpUsersEnterprisesDTO = new TmpUsersEnterprisesDTO(this.traceID, this.connection);
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD014', 'Buscando los usuarios Temporales del GE'));
        let users = await tmpUsersEnterprisesDTO.model.findAll({
            where: {
                economicGroupId: economicGroupID,
            },
        });
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD026', 'Usuarios consultados', 'tmpusers:', { users }));
        return users;
    }

    async getEconomicGroupUsers(economicGroupID) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD0025', 'Inicializando Modelos'));
        await this.initialize();
        let usersEnterprisesDTO = new UsersEnterprisesDTO(this.traceID, this.connection);
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD014', 'Buscando los usuarios del Grupo Economico'));
        let users = await usersEnterprisesDTO.model.findAll({
            where: {
                economicGroupId: economicGroupID,
            },
        });
        this.LOG.logging(
            LOGGER.LEVEL_DEBUG,
            LOGGER.buildAnyMessage('EGD026', 'Usuarios consultados', 'economicGroupID::users', `${JSON.stringify(economicGroupID)}::${JSON.stringify(users)}`)
        );
        return users;
    }

    async getUsers(user) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD0025', 'Inicializando Modelos'));
        let usersEnterprisesDTO = new UsersEnterprisesDTO(this.traceID, this.connection);
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD014', 'Buscando los usuarios del Grupo Economico'));
        let users = await usersEnterprisesDTO.model.findAndCountAll({
            where: {
                issuingCountry: user.userCountryExpedition,
                identificationType: user.identificationType,
                identificationNumber: user.identificationNumber,
            },
        });
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD021', 'Usuarios consultados', 'Users', JSON.stringify(users)));
        return users;
    }

    async getApprovalFlowProducts(products, economicGroupId) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD025', 'Inicializando Modelos'));
        await this.initialize();
        let approvalFlowProductsDTO = new ApprovalFlowProductsDTO(this.traceID, this.connection),
            approvalFlowDTO = new ApprovalFlowDTO(this.traceID, this.connection);
        approvalFlowProductsDTO.model.belongsTo(approvalFlowDTO.model, { foreignKey: 'approvalFlowId' });
        let options = {
            include: [
                {
                    model: approvalFlowDTO.model,
                    where: {
                        economicGroupId: economicGroupId,
                    },
                    attributes: [],
                },
            ],
            where: {
                productId: {
                    [Sequelize.Op.in]: products,
                },
            },
        };
        let approvalFlowProducts = await approvalFlowProductsDTO.model.findAndCountAll(options);
        this.LOG.logging(
            LOGGER.LEVEL_DEBUG,
            LOGGER.buildAnyMessage('EGD028', 'Fujos de aprovación encontrados', 'Flujos:', JSON.stringify(approvalFlowProducts))
        );
        return approvalFlowProducts;
    }

    async getTransactionsPAPG(products) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD029', 'Inicializando Modelos'));
        await this.initialize();
        let viSVETransactionsPAPGDTO = new VISVETransactionsPAPGDTO(this.traceID, this.connection);
        let options = {
            where: {
                product: {
                    [Sequelize.Op.in]: products,
                },
            },
        };
        let transactions = await viSVETransactionsPAPGDTO.model.findAndCountAll(options);
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD030', 'Transacciones encontradas', 'Flujos:', JSON.stringify(transactions)));
        return transactions;
    }

    async deleteEconomicGroupTmpUsers(economicGroupID) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD016', 'Inicializando Modelos'));
        let tmpUsersEnterprisesDTO = new TmpUsersEnterprisesDTO(this.traceID, this.connection);
        this.LOG.logging(
            LOGGER.LEVEL_DEBUG,
            LOGGER.buildAnyMessage('EGD017', 'Eliminando Usuarios Principales Temporales', 'economicGroupID', economicGroupID)
        );
        let options = {
            where: {
                economicGroupId: economicGroupID,
            },
        };
        await tmpUsersEnterprisesDTO.model.destroy(options);
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD018', 'Usuarios Temporales Eliminados', 'economicGroupID', economicGroupID));
        return true;
    }

    async updateUser(idUser, rolId) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD019', 'Inicializando Modelos'));
        let usersEnterprisesDTO = new UsersEnterprisesDTO(this.traceID, this.connection);
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD020', `Actualizando usuario: `));
        let usersEnterprises = await usersEnterprisesDTO.model.update(
            {
                rolId: rolId,
            },
            {
                where: {
                    id: idUser,
                },
            }
        );
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage('EGD008', 'Usuario Actualizado', 'Grupo Economico:', JSON.stringify(usersEnterprises)));
        return usersEnterprises;
    }
}

module.exports = {
    EconomicGroupDao,
};
