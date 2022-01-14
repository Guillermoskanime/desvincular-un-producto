"use strict";

const Cache = require("@com-banistmo/scg-cache-sdk"),
    LOGGER = require("@com-banistmo/scg-ms-logs-node"),
    { Utils } = require("../Utils"),
    Constants = require("../Constants"),
    { BaseObject } = require("../BaseObject");

class CacheProvider extends BaseObject {
    /**
     * Get value from cache management
     * @param {String} service
     * @param {String} entity
     * @param {String} attributes
     * @param {String} qualifier
     */
    async getValueFromCache(service, entity, attributes, attributeID) {
        let cacheKey = this.buildCacheKey(service, entity, attributes, attributeID),
            data;
        try {
            data = await Cache.get(this.traceID, cacheKey);
            this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage("CP002", "Data Obtained", "Data", JSON.stringify(data)));
        } catch (error) {
            this.LOG.logging(
                LOGGER.LEVEL_ERROR,
                LOGGER.buildAnyMessage("CP001", "Error getting the key from cache", "Error:", Utils.stringifyError(error))
            );
        }
        return data;
    }

    /**
     * Del value from cache management
     * @param {String} service
     * @param {String} entity
     * @param {String} attributes
     * @param {String} qualifier
     */
    async delKeyFromCache(service, entity, attributes, qualifier, channel) {
        let cacheKey = this.buildCacheKey(service, entity, attributes, qualifier, channel);
        try {
            this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage("CP006", "Data Deleted", "Key", cacheKey.toString()));
            let response = await Cache.del(this.traceID, cacheKey);
            this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage("CP007", "Data Deleted", "response", response));
        } catch (error) {
            this.LOG.logging(
                LOGGER.LEVEL_ERROR,
                LOGGER.buildAnyMessage("CP005", "Error deleting the key from cache", "Error:", Utils.stringifyError(error))
            );
        }
    }

    /**
     * Put value into cache management
     * @param {String} service
     * @param {String} entity
     * @param {String} attributes
     * @param {String} qualifier
     * @param {JSON} data
     */
    async putValueInCache(service, entity, attributes, attributeID, data) {
        let cacheKey = this.buildCacheKey(service, entity, attributes, attributeID);
        try {
            await Cache.set(this.traceID, cacheKey, data, Constants.CACHE.TTL);
            this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage("CP003", "Data Saved", "Data", JSON.stringify(data)));
        } catch (error) {
            this.LOG.logging(
                LOGGER.LEVEL_ERROR,
                LOGGER.buildAnyMessage("CP004", "Error saving the data in cache", "Error:", Utils.stringifyError(error))
            );
        }
    }

    /**
     * Builder method for cache key
     * @param {String} service - Nombre del servicio para construir la llave
     * @param {String} entity - Entidad a la que pertenece la información que se guarda en cache
     * @param {String} attributes - Atributo especifico de la entidad utilizado para construir la llave
     * @param {String} qualifier -  Utilizado para guardar llaves con atributos adicionales
     */
    buildCacheKey(service, entity, attributes, attributeID, channel) {
        let cacheKey = new Cache.Key();
        let channelCache = channel ? channel : Constants.CACHE.CHANNELS.MAC;
        cacheKey.setScope(Constants.CACHE.SCOPES.ALL);
        cacheKey.setChannel(channelCache);
        cacheKey.setService(service);
        cacheKey.setEntity(entity);
        cacheKey.setAttribute(attributes);
        cacheKey.setQualifier(attributeID);
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage("CP000", "Cache", "Build Key", JSON.stringify(cacheKey)));
        return cacheKey;
    }
}

module.exports = {
    CacheProvider
};
