'use strict';

const { BaseObject } = require('../../commons/BaseObject'),
	Sequelize = require('sequelize'),
	{ generateResponse, INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY } = require('../../commons/ResponseCreator'),
	StatusCodes = require('../../commons/StatusCodes'),
	{ Utils } = require('../../commons/Utils'),
	{ CacheProvider } = require('../../commons/cache/CacheProvider'),
	{ ADMEmpresasLambdaProvider } = require('../../commons/AWS/Lambda/ADMEmpresas/ADMEmpresasLambdaProvider'),
	{ UsersRegistrationLambdaProvider } = require('../../commons/AWS/Lambda/UsersRegistration/UsersRegistrationLambdaProvider'),
	{ EnterpriseRolesLambdaProvider } = require('../../commons/AWS/Lambda/EnterpriseRoles/EnterpriseRolesLambdaProvider'),
	{ SchedulerLambdaProvider } = require('../../commons/AWS/Lambda/Scheduler/SchedulerLambdaProvider'),
	Constants = require('../../commons/Constants'),
	LOGGER = require('@com-banistmo/scg-ms-logs-node'),
	jsonwebtoken = require('jsonwebtoken'),
	{ AyNSNSProvider } = require('../../commons/AWS/SNS/alertas-y-notificaciones/AyNSNSProvider'),
	{ AuditProvider } = require('../../commons/AWS/SNS/audit/AuditProvider');

class EconomicGroupService extends BaseObject {
	constructor(traceID, economicGroupDao) {
		super(traceID);
		this.economicGroupDao = economicGroupDao;
		this.enterpriseRolesLambdaProvider = new EnterpriseRolesLambdaProvider(traceID);
		this.cacheProvider = new CacheProvider(traceID);
	}

	async createEconomicGroup(name, administrativeApprovalType, monetaryApprovalType, segment, userCreation) {
		try {
			//Se elimina cache
			await this.cacheProvider.delKeyFromCache('*', Constants.CACHE.ENTITY, '*', '*');
			return await this.economicGroupDao.createEconomicGroup(name, administrativeApprovalType, monetaryApprovalType, segment, userCreation);
		} catch (error) {
			this.LOG.logging(LOGGER.LEVEL_ERROR, LOGGER.buildAnyMessage('EGS001', 'Error Creando el Grupo Economico', 'Error:', Utils.stringifyError(error)));
			this.validateErrorSequelize(error);
			throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_CREATION_ERROR);
		}
	}

	validateErrorSequelize(error) {
		if (error instanceof Sequelize.ValidationError) {
			error.errors.forEach(validationError => {
				if (validationError.message === 'name_unique must be unique') {
					throw generateResponse(this.traceID, UNPROCESSABLE_ENTITY, StatusCodes.DUPLICATED_ECONOMIC_GROUP_NAME);
				}
			});
		}
	}

	async updateEconomicGroup(economicGroupID, name, administrativeApprovalType, monetaryApprovalType, segment, userModification) {
		try {
			//Se elimina cache
			let qualifier = `economicGroupId=${economicGroupID}`;
			await this.cacheProvider.delKeyFromCache('*', '*', '*', qualifier, '*');
			return await this.economicGroupDao.updateEconomicGroup(
				economicGroupID,
				name,
				administrativeApprovalType,
				monetaryApprovalType,
				segment,
				userModification
			);
		} catch (error) {
			this.LOG.logging(
				LOGGER.LEVEL_ERROR,
				LOGGER.buildAnyMessage('EGS002', 'Error Actualizando el Grupo Economico', 'Error:', Utils.stringifyError(error))
			);
			this.validateErrorSequelize(error);
			throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_UPDATE_ERROR);
		}
	}

	async getEconomicGroupDetail(economicGroupID, event) {
		try {
			let qualifier = `economicGroupId=${economicGroupID}`;
			let economicGroupDetail = await this.cacheProvider.getValueFromCache(
				Constants.CACHE.SERVICE_EG_DETAIL,
				Constants.CACHE.ENTITY,
				Constants.CACHE.ATRIBUTE,
				qualifier
			);
			if (!economicGroupDetail) {
				economicGroupDetail = await this.economicGroupDao.getEconomicGroupDetail(economicGroupID);
				await this.cacheProvider.putValueInCache(
					Constants.CACHE.SERVICE_EG_DETAIL,
					Constants.CACHE.ENTITY,
					Constants.CACHE.ATRIBUTE,
					qualifier,
					economicGroupDetail
				);
			}
			//Registro en auditoría
			if (event) {
				let auditProvider = new AuditProvider(this.traceID, economicGroupID);
				await auditProvider.sendQueryDetailAuditMessage(event, economicGroupID, economicGroupDetail);
			}

			return economicGroupDetail;
		} catch (error) {
			this.LOG.logging(
				LOGGER.LEVEL_ERROR,
				LOGGER.buildAnyMessage('EGS003', 'Error Obteniendo el Grupo Economico', 'Error:', Utils.stringifyError(error))
			);
			throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_GET_ERROR);
		}
	}

	/**
	 * APROBACION_GE
	 * Consulta el detalle del GE actualizado, pendiente de aprobación
	 * @param {Number} economicGroupID
	 */
	async getEconomicGroupDetailTmp(economicGroupID) {
		try {
			//1. Se verifica si la versión en actualización existe en el cache
			let qualifier = `economicGroupId=${economicGroupID}`;
			let economicGroupDetail = await this.cacheProvider.getValueFromCache(
				Constants.CACHE.SERVICE_EG_DETAIL_TMP,
				Constants.CACHE.ENTITY_TMP,
				Constants.CACHE.ATRIBUTE,
				qualifier
			);
			if (!economicGroupDetail) {
				//2. Se consulta la versión en actualización en la BD
				economicGroupDetail = await this.economicGroupDao.getEconomicGroupDetailTmp(economicGroupID);
				this.LOG.logging(
					LOGGER.LEVEL_DEBUG,
					LOGGER.buildAnyMessage('EGS103', 'Información recuperada del GE Tmp', 'economicGroupDetail:', JSON.stringify(economicGroupDetail))
				);
				await this.cacheProvider.putValueInCache(
					Constants.CACHE.SERVICE_EG_DETAIL_TMP,
					Constants.CACHE.ENTITY_TMP,
					Constants.CACHE.ATRIBUTE,
					qualifier,
					economicGroupDetail
				);
			}
			return economicGroupDetail;
		} catch (error) {
			this.LOG.logging(
				LOGGER.LEVEL_ERROR,
				LOGGER.buildAnyMessage('EGS103', 'Error Obteniendo el Grupo Economico Tmp', 'Error:', Utils.stringifyError(error))
			);
			throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_GET_ERROR);
		}
	}

	async setEconomicGroupStatus(economicGroupID, status, userModification, event) {
		try {
			//Se elimina cache
			let qualifier = `economicGroupId=${economicGroupID}`;
			await this.cacheProvider.delKeyFromCache('*', '*', '*', qualifier, '*');
			qualifier = `${Constants.CACHE.WILDCARD}`;
			await this.cacheProvider.delKeyFromCache(Constants.CACHE.SERVICE_EG, Constants.CACHE.ENTITY, Constants.CACHE.WILDCARD, qualifier);
			//Metodo para crear registro en economic_group_transaction_commissions
			await this.economicGroupDao.setEconomicGroupTrxCommissions(economicGroupID);
			//Auditoria de creación
			let auditProvider = new AuditProvider(this.traceID, economicGroupID);
			await auditProvider.sendApproveCreationAuditMessage(event, economicGroupID);
			//Se actualiza estado a activo
			return await this.economicGroupDao.setEconomicGroupStatus(economicGroupID, status, userModification);
		} catch (error) {
			this.LOG.logging(
				LOGGER.LEVEL_ERROR,
				LOGGER.buildAnyMessage('EGS004', 'Error Obteniendo el Grupo Economico', 'Error:', Utils.stringifyError(error))
			);
			throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_SET_STATUS);
		}
	}

	/**
	 * APROBACION_GE
	 * Aplica la lógica de aprobación o rechazo de un GE
	 * @param {number} economicGroupID
	 * @param {string} decision
	 * @param {string} userModification
	 */
	async approveRejectEconomicGroup(event, economicGroupID, decision, userModification) {
		this.LOG.logging(
			LOGGER.LEVEL_INFO,
			LOGGER.buildAnyMessage('EGCS001', 'Inicia la aprobación del GE', 'economicGroupID:decision', `${economicGroupID}:${decision}`)
		);
		let transactionBlock = async transaction => {
			//Se ejecuta el proceso de aprobación del GE (paso de tablas temporales a principales)
			let approvalResult = await this.economicGroupDao.approveRejectEconomicGroup(economicGroupID, decision, userModification, transaction);
			this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage('EGCS001', 'Resultado de aprobación del GE', 'approvalResult:', approvalResult));
		};

		try {
			//Se consulta los usuarios ppales temporales, para luego determinar si se requiere su creación
			let usersTmp = await this.economicGroupDao.getEconomicGroupTmpUsers(economicGroupID);

			this.LOG.logging(
				LOGGER.LEVEL_DEBUG,
				LOGGER.buildAnyMessage('EGS104', 'Información des los usuarios TEMP', 'usersTmp:', JSON.stringify(usersTmp))
			);
			let usersDB = await this.economicGroupDao.getEconomicGroupUsers(economicGroupID);
			this.LOG.logging(
				LOGGER.LEVEL_DEBUG,
				LOGGER.buildAnyMessage('EGS105', 'Información de los usuarios oficiales', 'usersDB:', JSON.stringify(usersDB))
			);

			await this.economicGroupDao.executeTransaction(transactionBlock);

			//Si hay usuarios ppales nuevos se debe crear el usuario o verificar su rol
			await this.createPrimaryUsers(decision, usersTmp, economicGroupID, event, usersDB, userModification);
			this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage('EGCS001', 'Grupo Económico Aprobado'));
		} catch (error) {
			this.LOG.logging(LOGGER.LEVEL_ERROR, LOGGER.buildAnyMessage('EGS004', 'Error Aprobando el Grupo Economico', 'Error:', Utils.stringifyError(error)));
			throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_SET_STATUS);
		}
		//Se elimina cache
		let qualifier = `economicGroupId=${economicGroupID}${Constants.CACHE.WILDCARD}`;
		await this.cacheProvider.delKeyFromCache(
			Constants.CACHE.WILDCARD,
			Constants.CACHE.WILDCARD,
			Constants.CACHE.WILDCARD,
			qualifier,
			Constants.CACHE.WILDCARD
		);

		qualifier = `${Constants.CACHE.WILDCARD}`;
		await this.cacheProvider.delKeyFromCache(Constants.CACHE.SERVICE_EG, Constants.CACHE.ENTITY, Constants.CACHE.WILDCARD, qualifier);

		//Se elimina caché almacenada en consolidados
		await this.cacheProvider.delKeyFromCache(
			Constants.CACHE.CONSOLIDATE_GET_ENTERPRISE_INFO_SERVICE,
			Constants.CACHE.CONSOLIDATE_ENTITY,
			Constants.CACHE.WILDCARD,
			Constants.CACHE.WILDCARD,
			Constants.CACHE.CHANNELS.SVE
		);

		//Se elimina cache de limites de grupo economico
		qualifier = `${Constants.CACHE.WILDCARD}`;
		await this.cacheProvider.delKeyFromCache(
			Constants.CACHE.CACHE_SERVICE_GET_TRANSACTION_LIMITS_BY_ECONOMICGROUP,
			Constants.CACHE.CACHE_ENTITY_ECONOMICGROUP_LIMITS,
			Constants.CACHE.WILDCARD,
			qualifier
		);

		//Se guarda auditoria de la operacion
		if (decision === Constants.APPROVAL_DECISION.APPROVE) {
			let auditProvider = new AuditProvider(this.traceID, economicGroupID);
			await auditProvider.sendApproveAuditMessage(event, economicGroupID);
		} else if (decision === Constants.APPROVAL_DECISION.REJECT) {
			let auditProvider = new AuditProvider(this.traceID);
			await auditProvider.sendRejectAuditMessage(event, economicGroupID);
		}
		return true;
	}

	async createPrimaryUsers(decision, usersTmp, economicGroupID, event, usersDB, userModification) {
		if (decision === Constants.APPROVAL_DECISION.APPROVE) {
			if (usersTmp && Array.isArray(usersTmp) && usersTmp.length > 0) {
				for (let i = 0; i < usersTmp.length; i++) {
					//Se revisa si es un usuario nuevo
					if (usersTmp[i].userId === 0) {
						await this.createUserNew(economicGroupID, usersTmp, i, event);
					} else {
                        //si no es usuario nuevo verificamos si se cambió el rol principal
						await this.validateRolUser(usersDB, usersTmp, i, event, economicGroupID);
					}
					await this.economicGroupDao.deleteEconomicGroupTmpUsers(economicGroupID);
				}
				//Si el user id es 0 indica que el usuario es nuevo
			}
			//Se activan los usuarios ppales
			await this.activateMainUsers(event.headers, economicGroupID, userModification);
		}
	}

	async validateRolUser(usersDB, usersTmp, i, event, economicGroupID) {
		for (let e = 0; e < usersDB.length; e++) {
			if (usersTmp[i].userId === usersDB[e].id) {
				let baseProfileIndicator = null;
				if (usersTmp[i].hasTransactionAccess) {
					baseProfileIndicator = 'MONETARY';
				}
				else {
					baseProfileIndicator = 'ADMINISTRATIVE';
				}
				const roleResult = await this.enterpriseRolesLambdaProvider.getDefaultRolesIds(event.headers, economicGroupID, baseProfileIndicator);
				const parsedResult = JSON.parse(roleResult.body['@roleIdName']);
				if (parsedResult.roleId !== usersDB[e].rolId) {
					//Actualiza el rol del usuario
					await this.economicGroupDao.updateUser(usersDB[e].id, parsedResult.roleId);
				}
				//Se elimina cache de usuarios
				if (usersDB[e].username) {
					let qualifier = `username=${usersDB[e].username.toUpperCase()}`;
					await this.cacheProvider.delKeyFromCache(
						Constants.CACHE.WILDCARD,
						Constants.CACHE.USER_ENTITY,
						Constants.CACHE.WILDCARD,
						qualifier,
						Constants.CACHE.WILDCARD
					);
				}
			}
		}
	}

	async createUserNew(economicGroupID, usersTmp, i, event) {
		let newUser = {
			economicGroupId: economicGroupID,
			documentIssuingCountry: usersTmp[i].countryExpedition,
			identificationType: usersTmp[i].idType,
			identificationNumber: usersTmp[i].idNumber,
			name: usersTmp[i].name,
			lastName: usersTmp[i].lastName,
			email: usersTmp[i].email,
			mobile: usersTmp[i].mobile,
			countryCodeMobile: usersTmp[i].countryCodeMobile,
			transactionsAccess: usersTmp[i].hasTransactionAccess,
		};
		let usersRegistrationLambdaProvider = new UsersRegistrationLambdaProvider(this.traceID);
		await usersRegistrationLambdaProvider.createEGPrincipalUser(newUser, event);
	}

	/**
	 * APROBACION_GE
	 * Inactiva un GE
	 * @param {object} event
	 * @param {number} economicGroupID
	 * @param {string} userModification
	 */
	async inactivateEconomicGroup(event, economicGroupID, userModification) {
		//Se elimina cache
		let qualifier = `economicGroupId=${economicGroupID}`;
		let qualifier_username = null;
		await this.cacheProvider.delKeyFromCache('*', '*', '*', qualifier, '*');
		qualifier = `${Constants.CACHE.WILDCARD}`;
		await this.cacheProvider.delKeyFromCache(Constants.CACHE.SERVICE_EG, Constants.CACHE.ENTITY, Constants.CACHE.WILDCARD, qualifier);

		let transactionBlock = async transaction => {
			//Se inactivan usuarios
			this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage('EGCS001', 'Inicio de inactivación de usuarios'));
			let aDMEmpresasLambdaProvider = new ADMEmpresasLambdaProvider(this.traceID);
			let channel = jsonwebtoken.decode(event.headers.Authorization.split(' ')[1]);
			if (channel) {
				channel = channel.sub;
			}
			let users = await this.economicGroupDao.getEconomicGroupUsers(economicGroupID);
			let promisesToExecute = [];
			let promisesToExecuteCache = [];
			users.forEach(user => {
				if (user.username) {
					promisesToExecute.push(
						aDMEmpresasLambdaProvider.changeStatusUser(this.traceID, user.username.toUpperCase(), Constants.ADM_STATUS.INACTIVE, channel, event)
					);
					//Se borra al usuario del caché
					qualifier_username = `username=${user.username.toUpperCase()}`;
					promisesToExecuteCache.push(
						this.cacheProvider.delKeyFromCache(Constants.CACHE.WILDCARD, Constants.CACHE.USER_ENTITY, Constants.CACHE.WILDCARD, qualifier_username)
					);
				}
			});
			await Promise.all(promisesToExecute);
			await Promise.all(promisesToExecuteCache);

			//Se cancelan transacciones programadas
			this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage('EGCS001', 'Inicio de cancelación de transacciones programadas'));
			let schedulerLambdaProvider = new SchedulerLambdaProvider(this.traceID);
			await schedulerLambdaProvider.cancelEGTransactons(economicGroupID, event);

			//Se eliminan asociaciones con empresas y productos, y se crea imagen del GE
			this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage('EGCS001', 'Inicio de eliminación de asociaciones con empresas y productos'));
			await this.economicGroupDao.inactivateEconomicGroup(economicGroupID, userModification, transaction);
		};
		try {
			await this.economicGroupDao.executeTransaction(transactionBlock);
			this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage('EGCS001', 'Grupo Económico Inactivado'));
			await this.cacheProvider.delKeyFromCache(Constants.CACHE.SERVICE_EG, Constants.CACHE.ENTITY, Constants.CACHE.WILDCARD, qualifier);
		} catch (error) {
			this.LOG.logging(
				LOGGER.LEVEL_ERROR,
				LOGGER.buildAnyMessage('EGS004', 'Error Inactivando el Grupo Economico', 'Error:', Utils.stringifyError(error))
			);
			throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_INACTIVATE_INVALID_ERROR);
		}
		//Se guarda auditoria de la operacion
		let auditProvider = new AuditProvider(this.traceID);
		await auditProvider.sendInactiveAuditMessage(event, economicGroupID);
		return true;
	}

	async getEconomicGroups(offset, limit, filter, states) {
		try {
			let qualifier = `offset=${offset}&limit=${limit}&filter=${filter}&states=${states}`;
			let economicGroups = await this.cacheProvider.getValueFromCache(
				Constants.CACHE.SERVICE_EG,
				Constants.CACHE.ENTITY,
				Constants.CACHE.ATRIBUTE,
				qualifier
			);
			if (!economicGroups) {
				economicGroups = await this.economicGroupDao.getEconomicGroups(offset, limit, filter, states);
				await this.cacheProvider.putValueInCache(
					Constants.CACHE.SERVICE_EG,
					Constants.CACHE.ENTITY,
					Constants.CACHE.ATRIBUTE,
					qualifier,
					economicGroups
				);
			}
			return economicGroups;
		} catch (error) {
			this.LOG.logging(
				LOGGER.LEVEL_ERROR,
				LOGGER.buildAnyMessage('EGS005', 'Error Obteniendo los Grupos Economicos', 'Error:', Utils.stringifyError(error))
			);
			throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_LIST_ERROR);
		}
	}

	async activateMainUsers(headers, economicGroupID, userModification) {
		let mainUsersPendingApproval;
		try {
			mainUsersPendingApproval = await this.economicGroupDao.getEconomicGroupMainUsersByStatus(economicGroupID, Constants.STATUS.PENDING_APPROVAL);
		} catch (error) {
			throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_GET_MAIN_USERS_ERROR);
		}
		let promises = [],
			aynSNSProvider = new AyNSNSProvider(this.traceID);
		mainUsersPendingApproval.forEach(user => {
			promises.push(this.economicGroupDao.setUserStatus(user.id, Constants.STATUS.APPROVED, userModification));
			promises.push(aynSNSProvider.sendUserPreRegistrationEmail(headers, economicGroupID, user.name, user.lastname, user.email));
		});
		await Promise.all(promises);
	}

	async mainUpdateEconomicGroup(body, tokenInfo, headers, event) {
		try {
			let result;
			if (body.status === Constants.STATUS.REJECTED) {
				body.newStatus = Constants.STATUS.PENDING_APPROVAL;
				result = await this.economicGroupDao.mainUpdateEconomicGroupFromRejected(body, tokenInfo.sub, headers);
			} else if (body.status === Constants.STATUS.ACTIVE) {
				body.newStatus = Constants.STATUS.IN_VERIFICATION;
				result = await this.economicGroupDao.mainUpdateEconomicGroupFromActive(body, tokenInfo.sub, headers, event);
			}
			let qualifier;
			if (body.economicGroupId) {
				qualifier = `economicGroupId=${body.economicGroupId}${Constants.CACHE.WILDCARD}`;
				await this.cacheProvider.delKeyFromCache(Constants.CACHE.WILDCARD, Constants.CACHE.WILDCARD, Constants.CACHE.WILDCARD, qualifier);
			}
			qualifier = `${Constants.CACHE.WILDCARD}`;
			await this.cacheProvider.delKeyFromCache(Constants.CACHE.SERVICE_EG, Constants.CACHE.ENTITY, Constants.CACHE.WILDCARD, qualifier);

			qualifier = `${Constants.CACHE.WILDCARD}`;
			await this.cacheProvider.delKeyFromCache(
				Constants.CACHE.CONSOLIDATE_GET_ENTERPRISE_INFO_SERVICE,
				Constants.CACHE.CONSOLIDATE_ENTITY,
				Constants.CACHE.WILDCARD,
				qualifier
			);
			return result;
		} catch (error) {
			this.LOG.logging(
				LOGGER.LEVEL_ERROR,
				LOGGER.buildAnyMessage('EGS006', 'Error Actualizando el Grupo Economico', 'Error:', Utils.stringifyError(error))
			);
			throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_MAIN_UPDATE_ERROR);
		}
	}

	async getEconomicGroupMainUsersByStatus(economicGroupID, status) {
		try {
			return await this.economicGroupDao.getEconomicGroupMainUsersByStatus(economicGroupID, status);
		} catch (error) {
			throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_GET_MAIN_USERS_ERROR);
		}
	}
}

module.exports = {
	EconomicGroupService,
};
