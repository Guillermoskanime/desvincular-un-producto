"use strict";

const { BaseObject } = require("../../../commons/BaseObject"),
    Sequelize = require("sequelize"),
    { generateResponse, INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, FORBIDDEN } = require("../../../commons/ResponseCreator"),
    { CacheProvider } = require("../../../commons/cache/CacheProvider"),
    StatusCodes = require("../../../commons/StatusCodes"),
    Constants = require("../../../commons/Constants"),
    { Utils } = require("../../../commons/Utils"),
    { OpenIDLambdaProvider } = require("../../../commons/AWS/Lambda/OpenID/OpenIDLambdaProvider"),
    LOGGER = require("@com-banistmo/scg-ms-logs-node"),
    Lodash = require("lodash");

class EconomicGroupProductsService extends BaseObject {
    constructor(traceID, economicGroupProductsDao) {
        super(traceID);
        this.cacheProvider = new CacheProvider(traceID);
        this.economicGroupProductsDao = economicGroupProductsDao;
    }

    async getEconomicGroupEnterprisesDetail(userAccessToken, economicGroupID, offset, limit) {
        await this.validateUser(userAccessToken, economicGroupID);
        try {
            let qualifier = `economicGroupId=${economicGroupID}&offset=${offset}&limit=${limit}`;
            let economicGroupEnterprisesDetail = await this.cacheProvider.getValueFromCache(
                Constants.CACHE.SERVICE_ENTERPRISES,
                Constants.CACHE.ENTITY_PRODUCTS,
                Constants.CACHE.ATRIBUTE,
                qualifier
            );
            if (!economicGroupEnterprisesDetail) {
                economicGroupEnterprisesDetail = await this.economicGroupProductsDao.getEconomicGroupEnterprisesDetail(
                    economicGroupID,
                    offset,
                    limit
                );
                await this.cacheProvider.putValueInCache(
                    Constants.CACHE.SERVICE_ENTERPRISES,
                    Constants.CACHE.ENTITY_PRODUCTS,
                    Constants.CACHE.ATRIBUTE,
                    qualifier,
                    economicGroupEnterprisesDetail
                );
            }
            return economicGroupEnterprisesDetail;
        } catch (error) {
            this.LOG.logging(
                LOGGER.LEVEL_ERROR,
                LOGGER.buildAnyMessage("EGPS000", "Error Obteniendo las Empresas del Grupo Economico", "Error:", Utils.stringifyError(error))
            );
            throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_ENTERPRISES_GET_ERROR);
        }
    }

    async validateUser(userAccessToken, economicGroupID) {
        let openIDUserInfoLambdaProvider = new OpenIDLambdaProvider(this.traceID);
        let openId = await openIDUserInfoLambdaProvider.getUserInfo(userAccessToken);
        let aud = openId.aud;
        if (aud !== Constants.CHANNEL_ID.MAC) {
            //Si el usuario no es de mac se debe validar que pertenezca al GE que desea consultar
            let economicGroupIDToken = openId.economic_group_id;
            if (economicGroupIDToken !== economicGroupID) {
                throw generateResponse(this.traceID, FORBIDDEN, StatusCodes.ECONOMIC_GROUP_USER_DOES_NOT_BELONG_TO_EG_ERROR);
            }
        }
    }

    /**
     * APROBACION_GE
     * Busca la version en tablas temporales o inactivas de las empresas de un GE
     * @param {number} economicGroupID
     * @param {number} offset
     * @param {number} limit
     */
    async getEconomicGroupEnterprisesDetailTmp(userAccessToken, economicGroupID, offset, limit) {
        await this.validateUser(userAccessToken, economicGroupID);
        try {
            let qualifier = `economicGroupId=${economicGroupID}&offset=${offset}&limit=${limit}`;
            let economicGroupEnterprisesDetail = await this.cacheProvider.getValueFromCache(
                Constants.CACHE.SERVICE_ENTERPRISES_TMP,
                Constants.CACHE.ENTITY_PRODUCTS_TMP,
                Constants.CACHE.ATRIBUTE,
                qualifier
            );
            if (!economicGroupEnterprisesDetail) {
                economicGroupEnterprisesDetail = await this.economicGroupProductsDao.getEconomicGroupEnterprisesDetailTmp(
                    economicGroupID,
                    offset,
                    limit
                );
                await this.cacheProvider.putValueInCache(
                    Constants.CACHE.SERVICE_ENTERPRISES_TMP,
                    Constants.CACHE.ENTITY_PRODUCTS_TMP,
                    Constants.CACHE.ATRIBUTE,
                    qualifier,
                    economicGroupEnterprisesDetail
                );
            }
            return economicGroupEnterprisesDetail;
        } catch (error) {
            this.LOG.logging(
                LOGGER.LEVEL_ERROR,
                LOGGER.buildAnyMessage("EGPS000", "Error Obteniendo las Empresas del Grupo Economico", "Error:", Utils.stringifyError(error))
            );
            throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_ENTERPRISES_GET_ERROR);
        }
    }

    async getEconomicGroupEnterprisesDetailByUser(userAccessToken, offset, limit) {
        let openIDUserInfoLambdaProvider = new OpenIDLambdaProvider(this.traceID),
            economicGroupID = (await openIDUserInfoLambdaProvider.getUserInfo(userAccessToken)).economic_group_id;
        return await this.getEconomicGroupEnterprisesDetail(userAccessToken, economicGroupID, offset, limit);
    }

    async economicGroupEnterprisesProductsDetail(economicGroupID, CISNumber, offset, limit, sort, userAccessToken) {
        await this.validateUser(userAccessToken, economicGroupID);
        try {
            let qualifier = `economicGroupId=${economicGroupID}&enterpriseId=${CISNumber}&offset=${offset}&limit=${limit}&sort=${sort}`;
            let economicGroupEnterprisesProductsDetail = await this.cacheProvider.getValueFromCache(
                Constants.CACHE.SERVICE_PRODUCTS_DETAIL,
                Constants.CACHE.ENTITY_PRODUCTS,
                Constants.CACHE.ATRIBUTE,
                qualifier
            );
            if (!economicGroupEnterprisesProductsDetail) {
                economicGroupEnterprisesProductsDetail = await this.economicGroupProductsDao.economicGroupEnterprisesProductsDetail(
                    economicGroupID,
                    CISNumber,
                    offset,
                    limit,
                    sort
                );
                await this.cacheProvider.putValueInCache(
                    Constants.CACHE.SERVICE_PRODUCTS_DETAIL,
                    Constants.CACHE.ENTITY_PRODUCTS,
                    Constants.CACHE.ATRIBUTE,
                    qualifier,
                    economicGroupEnterprisesProductsDetail
                );
            }
            return economicGroupEnterprisesProductsDetail;
        } catch (error) {
            this.LOG.logging(
                LOGGER.LEVEL_ERROR,
                LOGGER.buildAnyMessage(
                    "EGPS001",
                    "Error Obteniendo los Productos de la Empresa del Grupo Economico",
                    "Error:",
                    Utils.stringifyError(error)
                )
            );
            throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_PRODUCT_ENTERPRISE_GET_ERROR);
        }
    }

    //APROBACION_GE
    async economicGroupEnterprisesProductsDetailTmp(economicGroupID, CISNumber, offset, limit, sort, userAccessToken) {
        await this.validateUser(userAccessToken, economicGroupID);
        try {
            let qualifier = `economicGroupId=${economicGroupID}&enterpriseId=${CISNumber}&offset=${offset}&limit=${limit}&sort=${sort}`;
            let economicGroupEnterprisesProductsDetail = await this.cacheProvider.getValueFromCache(
                Constants.CACHE.SERVICE_PRODUCTS_DETAIL_TMP,
                Constants.CACHE.ENTITY_PRODUCTS_TMP,
                Constants.CACHE.ATRIBUTE,
                qualifier
            );
            if (!economicGroupEnterprisesProductsDetail) {
                economicGroupEnterprisesProductsDetail = await this.economicGroupProductsDao.economicGroupEnterprisesProductsDetailTmp(
                    economicGroupID,
                    CISNumber,
                    offset,
                    limit,
                    sort
                );
                await this.cacheProvider.putValueInCache(
                    Constants.CACHE.SERVICE_PRODUCTS_DETAIL_TMP,
                    Constants.CACHE.ENTITY_PRODUCTS_TMP,
                    Constants.CACHE.ATRIBUTE,
                    qualifier,
                    economicGroupEnterprisesProductsDetail
                );
            }
            return economicGroupEnterprisesProductsDetail;
        } catch (error) {
            this.LOG.logging(
                LOGGER.LEVEL_ERROR,
                LOGGER.buildAnyMessage(
                    "EGPS101",
                    "Error Obteniendo los Productos de la Empresa del Grupo Economico en su versión Tmp",
                    "Error:",
                    Utils.stringifyError(error)
                )
            );
            throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_PRODUCT_ENTERPRISE_GET_ERROR);
        }
    }

    async setEconomicGroupProducts(economicGroupID, CISNumber, products, enterpriseDetails, userOperation) {
        let transactionBlock = async transaction => {
            let enterpriseEconomicGroup = await this.economicGroupProductsDao.findEnterpriseEconomicGroup(CISNumber, transaction);
            if (
                enterpriseEconomicGroup &&
                enterpriseEconomicGroup.cisNumber &&
                enterpriseEconomicGroup.economicGroupID !== parseInt(economicGroupID, 10)
            ) {
                throw new Error("CIS ya Asociado a otra empresa");
            } else if (enterpriseEconomicGroup && enterpriseEconomicGroup.cisNumber) {
                let updatePromises = [
                    this.economicGroupProductsDao.updateEnterpriseEconomicGroup(CISNumber, userOperation, enterpriseDetails, transaction),
                    this.economicGroupProductsDao.eliminateAllEnterpriseProductsNotPresent(CISNumber, transaction, products)
                ];
                await Promise.all(updatePromises);
            } else {
                await this.economicGroupProductsDao.createEnterpriseEconomicGroup(
                    CISNumber,
                    economicGroupID,
                    userOperation,
                    enterpriseDetails,
                    transaction
                );
            }
            let promisesToExecute = [];
            products.forEach(product => {
                promisesToExecute.push(this.economicGroupProductsDao.saveProduct(CISNumber, product, transaction));
            });
            await Promise.all(promisesToExecute);
        };
        try {
            let qualifier = `economicGroupId=${economicGroupID}*`;
            await this.cacheProvider.delKeyFromCache("*", "*", "*", qualifier, "*");
            await this.economicGroupProductsDao.executeTransaction(transactionBlock);
        } catch (error) {
            if (error.message.includes("a foreign key constraint fails")) {
                throw generateResponse(this.traceID, UNPROCESSABLE_ENTITY, StatusCodes.ECONOMIC_GROUP_ENTERPRISE_PRODUCT_DELETE_ERROR);
            }
            this.LOG.logging(
                LOGGER.LEVEL_ERROR,
                LOGGER.buildAnyMessage(
                    "EGPS002",
                    "Error Guardando los Productos de la Empresa del Grupo Economico",
                    "Error:",
                    Utils.stringifyError(error)
                )
            );
            throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_PRODUCT_ENTERPRISE_SET_ERROR);
        }
    }

    async getEconomicGroupProducts(economicGroupID, productType) {
        try {
            let qualifier = `economicGroupId=${economicGroupID}&productType=${productType}`;
            let economicGroupEnterprisesProducts = await this.cacheProvider.getValueFromCache(
                Constants.CACHE.SERVICE_PRODUCTS,
                Constants.CACHE.ENTITY_PRODUCTS,
                Constants.CACHE.ATRIBUTE,
                qualifier
            );
            if (!economicGroupEnterprisesProducts) {
                economicGroupEnterprisesProducts = await this.economicGroupProductsDao.getEconomicGroupProducts(economicGroupID, productType);
                await this.cacheProvider.putValueInCache(
                    Constants.CACHE.SERVICE_PRODUCTS,
                    Constants.CACHE.ENTITY_PRODUCTS,
                    Constants.CACHE.ATRIBUTE,
                    qualifier,
                    economicGroupEnterprisesProducts
                );
            }
            return economicGroupEnterprisesProducts;
        } catch (error) {
            this.LOG.logging(
                LOGGER.LEVEL_ERROR,
                LOGGER.buildAnyMessage("EGPS003", "Error Obteniendo los Productos del Grupo Economico", "Error:", Utils.stringifyError(error))
            );
            throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_PRODUCT_GET_ERROR);
        }
    }

    async getEconomicGroupProductsByUser(userAccessToken, productType) {
        let openIDUserInfoLambdaProvider = new OpenIDLambdaProvider(this.traceID),
            economicGroupID = (await openIDUserInfoLambdaProvider.getUserInfo(userAccessToken)).economic_group_id;
        return await this.getEconomicGroupProducts(economicGroupID, productType);
    }

    async deleteEconomicGroupEnterprise(economicGroupID, CISNumber) {
        let transactionBlock = async transaction => {
            await this.economicGroupProductsDao.eliminateAllEnterpriseProducts(CISNumber, transaction);
            await this.economicGroupProductsDao.eliminateEnterpriseEconomicGroup(economicGroupID, CISNumber, transaction);
        };
        try {
            //Se limpia cache
            let qualifier = `economicGroupId=${economicGroupID}*`;
            await this.cacheProvider.delKeyFromCache("*", "*", "*", qualifier, "*");
            await this.economicGroupProductsDao.executeTransaction(transactionBlock);
        } catch (error) {
            this.LOG.logging(
                LOGGER.LEVEL_ERROR,
                LOGGER.buildAnyMessage("EGPS004", "Error Eliminando la Empresa del Grupo Economico", "Error:", Utils.stringifyError(error))
            );
            if (error.message.includes("a foreign key constraint fails")) {
                throw generateResponse(this.traceID, UNPROCESSABLE_ENTITY, StatusCodes.ECONOMIC_GROUP_ENTERPRISE_COMMISSIONN_DELETE_ERROR);
            }
            throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_ENTERPRISE_DELETE_ERROR);
        }
    }

    async getEconomicGroupEnterprisesDetailLegacy(economicGroupID, offset, limit) {
        try {
            let qualifier = `economicGroupId=${economicGroupID}&offset=${offset}&limit=${limit}`;
            let economicGroupEnterprisesDetail = await this.cacheProvider.getValueFromCache(
                Constants.CACHE.SERVICE_PRODUCTS_LEGACY,
                Constants.CACHE.ENTITY_PRODUCTS,
                Constants.CACHE.ATRIBUTE,
                qualifier
            );
            if (!economicGroupEnterprisesDetail) {
                economicGroupEnterprisesDetail = JSON.parse(
                    JSON.stringify(await this.economicGroupProductsDao.getEconomicGroupEnterprisesDetailLegacy(economicGroupID, offset, limit))
                );
                await this.cacheProvider.putValueInCache(
                    Constants.CACHE.SERVICE_PRODUCTS_LEGACY,
                    Constants.CACHE.ENTITY_PRODUCTS,
                    Constants.CACHE.ATRIBUTE,
                    qualifier,
                    economicGroupEnterprisesDetail
                );
            }
            let productKeyMap = {
                productNumber: "acctId",
                currencyCode: "currency",
                productType: "type",
                productSubtype: "subType"
            };
            let enterpriseKeyMap = {
                cisNumber: "id_entity",
                economicGroupID: "id_economic_group",
                enterprise_products: "products"
            };
            this.LOG.logging(
                LOGGER.LEVEL_DEBUG,
                LOGGER.buildAnyMessage(
                    "EGPS006",
                    "Mapeando respuesta Empresas del Grupo Economico LEGADO",
                    "Empresas:",
                    JSON.stringify(economicGroupEnterprisesDetail)
                )
            );
            economicGroupEnterprisesDetail.rows = economicGroupEnterprisesDetail.rows.map(enterprise => {
                enterprise.enterprise_products = enterprise.enterprise_products.map(product => {
                    return mapKeys(product, productKeyMap);
                });
                return mapKeys(enterprise, enterpriseKeyMap);
            });
            return economicGroupEnterprisesDetail;
        } catch (error) {
            this.LOG.logging(
                LOGGER.LEVEL_ERROR,
                LOGGER.buildAnyMessage("EGPS005", "Error Obteniendo las Empresas del Grupo Economico LEGADO", "Error:", Utils.stringifyError(error))
            );
            throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ECONOMIC_GROUP_ENTERPRISES_LEGACY_GET_ERROR);
        }
    }
}

function mapKeys(object, map) {
    return Lodash.mapKeys(object, (value, key) => {
        if (map[key]) {
            return map[key];
        }
        return key;
    });
}

module.exports = {
    EconomicGroupProductsService
};
