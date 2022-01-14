'use strict';

const { BaseObject } = require('../../../commons/BaseObject'),
	{ generateResponse, INTERNAL_SERVER_ERROR } = require('../../../commons/ResponseCreator'),
	{ EnterpriseProductsService } = require('../../enterprise/products/EnterpriseProductsService'),
	StatusCodes = require('../../../commons/StatusCodes'),
	{ Utils } = require('../../../commons/Utils'),
	Constants = require('../../../commons/Constants'),
	LOGGER = require('@com-banistmo/scg-ms-logs-node');
class ProductsValidationsService extends BaseObject {
	constructor(traceID, economicGroupProductsDao, economicGroupDao, economicGroupCommissionDao) {
		super(traceID);
		this.economicGroupProductsDao = economicGroupProductsDao;
		this.economicGroupDao = economicGroupDao;
		this.economicGroupCommissionDao = economicGroupCommissionDao;
		this.enterpriseProductsService = new EnterpriseProductsService(traceID, economicGroupProductsDao);
	}

	async validations(economicGroupId, products, commissions, tokenInfo) {
		this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage('EGVP001', 'Inicio de validacíon de Productos', 'DATA: ', JSON.stringify(products)));
		let promisesResults = await Promise.all([
			this.productsAssociateValidations(products.associated, tokenInfo),
			this.productsDeletedValidations(economicGroupId, products.unassociated, commissions),
		]);
		return [...promisesResults[0], ...promisesResults[1]];
	}

	async productsAssociateValidations(products, tokenInfo) {
		this.LOG.logging(
			LOGGER.LEVEL_INFO,
			LOGGER.buildAnyMessage('EGVP002', 'Inicio de validacíon de Productos a asociar', 'DATA: ', JSON.stringify(products))
		);
		let arrayError = [];
		for (let i = 0; i < products.length; i++) {
			let compositionResponse = await this.enterpriseProductsService.getProductsEnterprise(tokenInfo, products[i].cis);
			this.LOG.logging(
				LOGGER.LEVEL_INFO,
				LOGGER.buildAnyMessage('EGVP003', 'Inicio de validacíon de Productos a asociar', 'DATA: ', JSON.stringify(compositionResponse))
			);
			let productsComposition = [];
			compositionResponse.partyAcctRelRec.cardAcctRelInfo.forEach(p => {
				productsComposition.push(p.cardAcctRelId);
			});
			if (productsComposition.indexOf(products[i].acctId) < 0) {
				this.LOG.logging(
					LOGGER.LEVEL_ERROR,
					LOGGER.buildAnyMessage(
						'EGVP004',
						'Error al agregar uno de los productos, no pertence a algunas de las empresas del grupo económico.',
						'Error:',
						'Transacciones: ' + JSON.stringify(productsComposition)
					)
				);
				let errorTmp = StatusCodes.PRODUCT_NOT_BELONG_COMPANY_EG;
				errorTmp.detail = products[i];
				arrayError = [...arrayError, ...[Object.assign({}, errorTmp)]];
			}
		}
		return arrayError;
	}

	async productsDeletedValidations(economicGroupId, products, commissions) {
		this.LOG.logging(
			LOGGER.LEVEL_INFO,
			LOGGER.buildAnyMessage('EGVP005', 'Inicio de validacíon de Productos a eliminar', 'DATA: ', JSON.stringify(products))
		);
		let economicGroupProductsDeleted,
			arrayPromises = [];

		economicGroupProductsDeleted = products.map(p => {
			return p.acctId;
		});
		arrayPromises.push(this.approvalFlowsValidations(economicGroupProductsDeleted, products, economicGroupId));
		arrayPromises.push(this.commissionsValidations(economicGroupProductsDeleted, products, economicGroupId, commissions));
		arrayPromises.push(this.transactionsPAPGValidations(economicGroupProductsDeleted, products));
		arrayPromises.push(this.productsGroupValidations(economicGroupProductsDeleted, products, economicGroupId));
		let promisesResults = await Promise.all(arrayPromises);
		return [...promisesResults[0], ...promisesResults[1], ...promisesResults[2], ...promisesResults[3]];
	}

	//Validación de flujos de aprovación para productos eliminados
	async approvalFlowsValidations(economicGroupProductsDeleted, products, economicGroupId) {
		let approbalFlowProducts,
			arrayError = [];
		try {
			approbalFlowProducts = await this.economicGroupDao.getApprovalFlowProducts(economicGroupProductsDeleted, economicGroupId);
		} catch (error) {
			this.LOG.logging(
				LOGGER.LEVEL_ERROR,
				LOGGER.buildAnyMessage('EGVP006', 'Error Obteniendo Flujos de aprovación de productos', 'Error:', Utils.stringifyError(error))
			);
			throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_PRODUCT_GET_ERROR);
		}
		if (approbalFlowProducts.count > 0) {
			this.LOG.logging(
				LOGGER.LEVEL_ERROR,
				LOGGER.buildAnyMessage(
					'EGVP007',
					'Error en la eliminación de algunos de los productos, tiene flujos de aprobación activos.',
					'Error:',
					'Producto: ' + JSON.stringify(approbalFlowProducts)
				)
			);
			this.LOG.logging(
				LOGGER.LEVEL_INFO,
				LOGGER.buildAnyMessage('EGVP008', 'Productos a revisar contra flujos de aprobación:', 'DATA: ', JSON.stringify(products))
			);

			products.forEach(p => {
				approbalFlowProducts.rows.some(a => {
					if (a.productId === p.acctId) {
						let errorTmp = StatusCodes.PRODUCT_BELONG_APPROVAL_FLOW;
						errorTmp.detail = p;
						arrayError = [...arrayError, ...[Object.assign({}, errorTmp)]];
						return true;
					}
					return false;
				});
			});
		}
		return arrayError;
	}
	//Validación de Comisiones para productos eliminados
	async commissionsValidations(economicGroupProductsDeleted, products, economicGroupId, commissions) {
		let economicGroupCommissions,
			arrayError = [];
		if (commissions) {
			commissions.forEach(c => {
				if (economicGroupProductsDeleted.indexOf(c.chargeAccount) > -1) {
					this.LOG.logging(
						LOGGER.LEVEL_ERROR,
						LOGGER.buildAnyMessage(
							'EGVP009',
							`Error, el producto ${c.chargeAccount} está asignado a una cuenta principal de la comisión`,
							'Error:',
							c.chargeAccount
						)
					);
					let productConflict = products.filter(p => c.chargeAccount === p.acctId);
					let errorTmp = StatusCodes.PRODUCT_ASSOCIATED_MAIN_ACCOUNT;
					errorTmp.detail = productConflict[0];
					arrayError = [...arrayError, ...[Object.assign({}, errorTmp)]];
				}
				arrayError = this.searchBackupAccount(economicGroupProductsDeleted, c, products, arrayError);
			});
		} else {
			try {
				economicGroupCommissions = await this.economicGroupCommissionDao.getEconomicGroupCommissionDetail(economicGroupId);
			} catch (error) {
				this.LOG.logging(
					LOGGER.LEVEL_ERROR,
					LOGGER.buildAnyMessage('EGVP011', 'Error Obteniendo Comisiones del grupo económico', 'Error:', Utils.stringifyError(error))
				);
				throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_PRODUCT_GET_ERROR);
			}
			economicGroupCommissions.forEach(c => {
				if (economicGroupProductsDeleted.indexOf(c.commissionAccount) >= 0) {
					this.LOG.logging(
						LOGGER.LEVEL_ERROR,
						LOGGER.buildAnyMessage(
							'EGVP012',
							`Error, el producto ${c.commissionAccount} está asignado a una cuenta principal de la comisión`,
							'Error:',
							c.commissionAccount
						)
					);
					let productConflict = products.filter(p => c.commissionAccount === p.acctId);
					let errorTmp = StatusCodes.PRODUCT_ASSOCIATED_MAIN_ACCOUNT;
					errorTmp.detail = productConflict[0];
					arrayError = [...arrayError, ...[Object.assign({}, errorTmp)]];
				}
				if (economicGroupProductsDeleted.indexOf(c.commissionBackupAccount) >= 0) {
					this.LOG.logging(
						LOGGER.LEVEL_ERROR,
						LOGGER.buildAnyMessage(
							'EGVP013',
							`Error, el producto ${c.commissionBackupAccount} está asignado a una cuenta de respaldo de la comisión`,
							'Error:',
							c.commissionBackupAccount
						)
					);
					let productConflict = products.filter(p => c.commissionBackupAccount === p.acctId);
					let errorTmp = StatusCodes.PRODUCT_ASSOCIATED_BACKUP_ACCOUNT;
					errorTmp.detail = productConflict[0];
					arrayError = [...arrayError, ...[Object.assign({}, errorTmp)]];
				}
			});
		}
		return arrayError;
	}

	searchBackupAccount(economicGroupProductsDeleted, c, products, arrayError) {
		if (economicGroupProductsDeleted.indexOf(c.chargeAccountBackup) > -1) {
			this.LOG.logging(
				LOGGER.LEVEL_ERROR,
				LOGGER.buildAnyMessage(
					'EGVP010',
					`Error, el producto ${c.chargeAccountBackup} está asignado a una cuenta de respaldo de la comisión`,
					'Error:',
					c.chargeAccountBackup
				)
			);
			let productConflict = products.filter(p => c.chargeAccountBackup === p.acctId);
			let errorTmp = StatusCodes.PRODUCT_ASSOCIATED_BACKUP_ACCOUNT;
			errorTmp.detail = productConflict[0];
			arrayError = [...arrayError, ...[Object.assign({}, errorTmp)]];
		}
		return arrayError;
	}

	//Validación de Transaciones Programadas o pendientes de aprobación para productos eliminados
	async transactionsPAPGValidations(economicGroupProductsDeleted, products) {
		let transactionsPAPG,
			arrayError = [];
		try {
			transactionsPAPG = await this.economicGroupDao.getTransactionsPAPG(economicGroupProductsDeleted);
		} catch (error) {
			this.LOG.logging(
				LOGGER.LEVEL_ERROR,
				LOGGER.buildAnyMessage('EGVP014', 'Error Obteniendo Transacciones de los productos a eliminar', 'Error:', Utils.stringifyError(error))
			);
			throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_TRANSACTION_PA_PG_GET_ERROR);
		}
		arrayError = this.searchTxPending(transactionsPAPG, products, arrayError);
		return arrayError;
	}

	searchTxPending(transactionsPAPG, products, arrayError) {
		if (transactionsPAPG.count > 0) {
			this.LOG.logging(
				LOGGER.LEVEL_ERROR,
				LOGGER.buildAnyMessage(
					'EGVP015',
					'Error en la eliminación de algunos de los productos, tiene Transacciones pendendientes.',
					'Error:',
					'Transacciones: ' + JSON.stringify(transactionsPAPG.rows)
				)
			);

			products.forEach(p => {
				let errorTmp;
				transactionsPAPG.rows.some(t => {
					if (p.acctId === t.product) {
						if (t.status === Constants.TRANSACTION_STATUS.SCHEDULED)
							errorTmp = StatusCodes.PRODUCT_ASSOCIATED_SCHEDULED_TRANSACTIONS;
						if (t.status === Constants.TRANSACTION_STATUS.APPROVAL_TRANSACTION)
							errorTmp = StatusCodes.PRODUCT_ASSOCIATED_APPROVAL_TRANSACTIONS;
						errorTmp.detail = p;
						arrayError = [...arrayError, ...[Object.assign({}, errorTmp)]];
						return true;
					}
					return false;
				});
			});
		}
		return arrayError;
	}

	//Valida que los productos a eliminar no se encuentren en algún grupo de productos.
	async productsGroupValidations(economicGroupProductsDeleted, products, economicGroupId) {
		let productGroup,
			arrayError = [];
		try {
			productGroup = await this.economicGroupProductsDao.getProductGroupDetail(economicGroupProductsDeleted, economicGroupId);
		} catch (error) {
			this.LOG.logging(
				LOGGER.LEVEL_ERROR,
				LOGGER.buildAnyMessage('EGVP016', 'Error Obteniendo los grupos de productos de los productos a eliminar', 'Error:', Utils.stringifyError(error))
			);
			throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_TRANSACTION_PA_PG_GET_ERROR);
		}
		if (productGroup.count > 0) {
			this.LOG.logging(
				LOGGER.LEVEL_ERROR,
				LOGGER.buildAnyMessage(
					'EGVP017',
					'Error en la eliminación de algunos de los productos, está asociado a algún grupo de productos.',
					'Error:',
					'Productos: ' + JSON.stringify(productGroup.rows)
				)
			);

			products.forEach(p => {
				productGroup.rows.some(pg => {
					if (p.acctId === pg.productNumber) {
						let errorTmp = StatusCodes.PRODUCT_BELONG_GROUP_PRODUCTS;
						errorTmp.detail = p;
						arrayError = [...arrayError, ...[Object.assign({}, errorTmp)]];
						return true;
					}
					return false;
				});
			});
		}
		return arrayError;
	}
}

module.exports = {
	ProductsValidationsService,
};
