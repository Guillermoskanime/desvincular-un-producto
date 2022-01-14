const SNSProvider = require("../SNSProvider").SNSProvider,
    Constants = require("../../../Constants"),
    LOGGER = require("@com-banistmo/scg-ms-logs-node"),
    { Utils } = require("../../../Utils");

class AuditProvider extends SNSProvider {

    constructor(LOG) {
        super(LOG);
    }

    /**
     * Arma y envía un mensaje de auditoría para la operación de aprobación de GE
     * @param {object} event
     * @param {number} economicGroupID
     */
    async sendApproveAuditMessage(event, economicGroupID) {
        let snsPayload = this.buildAuditPayload(event, Constants.AUDIT.APPROVE_OPERATION, economicGroupID, Constants.AUDIT.TABLE_NAME);
        await this.sendAuditMessage(snsPayload);
    }

     /**
     * Arma y envía un mensaje de auditoría para la operación de aprobación de GE
     * @param {object} event
     * @param {number} economicGroupID
     */
    async sendApproveCreationAuditMessage(event, economicGroupID) {
        let snsPayload = this.buildAuditPayload(event, Constants.AUDIT.APPROVE_CREATION_OPERATION, economicGroupID, Constants.AUDIT.TABLE_NAME);
        await this.sendAuditMessage(snsPayload);
    }

    /**
     * Arma y envía un mensaje de auditoría para la operación de aprobación de remplazo usuarios principales
     * @param {object} event
     * @param {number} userID
     */
    async sendApproveUserAuditMessage(event, userID) {
        let snsPayload = this.buildAuditPayload(event, Constants.AUDIT.APPROVE_OPERATION, userID, Constants.AUDIT.TABLE_NAME_USER);
        await this.sendAuditMessage(snsPayload);
    }

    /**
     * Arma y envía un mensaje de auditoría para la operación de rechazo de GE
     * @param {object} event
     * @param {number} economicGroupID
     */
    async sendRejectAuditMessage(event, economicGroupID) {
        let snsPayload = this.buildAuditPayload(event, Constants.AUDIT.REJECT_OPERATION, economicGroupID, Constants.AUDIT.TABLE_NAME);
        await this.sendAuditMessage(snsPayload);
    }

    /**
     * Arma y envía un mensaje de auditoría para la operación de rechazo de remplazo usuarios principales
     * @param {object} event
     * @param {number} userID
     */
    async sendRejectUserAuditMessage(event, userID) {
        let snsPayload = this.buildAuditPayload(event, Constants.AUDIT.REJECT_OPERATION, userID, Constants.AUDIT.TABLE_NAME_USER);
        await this.sendAuditMessage(snsPayload);
    }

    /**
     * Arma y envía un mensaje de auditoría para la operación de inactivación de GE
     * @param {object} event
     * @param {number} economicGroupID
     */
    async sendInactiveAuditMessage(event, economicGroupID) {
        let snsPayload = this.buildAuditPayload(event, Constants.AUDIT.INACTIVATE_OPERATION, economicGroupID, Constants.AUDIT.TABLE_NAME);
        await this.sendAuditMessage(snsPayload);
    }

    /**
     * Arma y envía un mensaje de auditoría para la consulta de comssiones
     * @param {object} event
     * @param {number} economicGroupID
     */
    async sendQueryCommissionAuditMessage(event, economicGroupID) {
        let snsPayload = this.buildAuditPayload(event, Constants.AUDIT.SELECT_OPERATION, economicGroupID, Constants.AUDIT.COMMISSION.DETAIL);
        await this.sendAuditMessage(snsPayload);
    }

    /**
     * Arma y envía un mensaje de auditoría para la operación de consulta de un GE
     * @param {object} event
     * @param {number} economicGroupID
     */
    async sendQueryDetailAuditMessage(event, economicGroupID, economicGroupDetail) {
        let snsPayload = this.buildAuditPayload(event, Constants.AUDIT.QUERY_DETAIL_OPERATION, economicGroupID, Constants.AUDIT.TABLE_NAME, economicGroupDetail);
        await this.sendAuditMessage(snsPayload);
    }

    async sendReplaceUserAuditMessage(event, userID) {
        let snsPayload = this.buildAuditPayload(event, Constants.AUDIT.REPLACE_OPERATION, userID, Constants.AUDIT.TABLE_NAME_USER);
        await this.sendAuditMessage(snsPayload);
    }

    /**
     * Arma y envía un mensaje de auditoría para la operación de aprobación de GE
     * @param {object} event
     * @param {number} economicGroupID
     */
    async sendUpdateEnterpriseAndProductsAuditMessage(event, economicGroupID) {
        let snsPayload = this.buildAuditPayload(event, Constants.AUDIT.UPDATE_OPERATION, economicGroupID, Constants.AUDIT.TABLE_ENTERPRISE_ECONOMIC_GROUP);
        await this.sendAuditMessage(snsPayload);
        let snsPayload2 = this.buildAuditPayload(event, Constants.AUDIT.UPDATE_OPERATION, economicGroupID, Constants.AUDIT.TABLE_ENTERPRISE_PRODUCT);
        await this.sendAuditMessage(snsPayload2);
    }

    /**
     * Arma y envía un mensaje de auditoría para la operación de aprobación de GE
     * @param {object} event
     * @param {number} economicGroupID
     */
    async sendUpdateLimitsAuditMessage(event, economicGroupID) {
        let snsPayload = this.buildAuditPayload(event, Constants.AUDIT.UPDATE_OPERATION, economicGroupID, Constants.AUDIT.TABLE_ECONOMIC_GROUP_MONETARY_LIMIT);
        await this.sendAuditMessage(snsPayload);
    }

      /**
     * Guarda en los logs de auditoría la actualización automática realizada sobre cada GE diariamente
     * @param {object} event
     * @param {number} economicGroupID
     * @param {object} detail
     */
       async sendUpdateGEAuditMessage(event, economicGroupID, detail) {
        let snsPayload = this.buildAuditPayload(event, Constants.AUDIT.UPDATE_OPERATION, economicGroupID, Constants.AUDIT.TABLE_NAME_PRODUCT_GROUP_DETAIL, detail);
        await this.sendAuditMessage(snsPayload);
    }

    /**
     * Envía el mensaje de auditoría recibido como parámetro
     * @param {object} snsPayload
     */
    async sendAuditMessage(snsPayload) {
        let messageID;
        try {
            messageID = await this.publishToSNS(Constants.TOPICS.TOPIC_AUDIT, snsPayload);
            this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage("SNS000", "SNS Message Id", "SNS Message Id:", JSON.stringify(messageID)));
        } catch (err) {
            this.LOG.logging(LOGGER.LEVEL_ERROR, LOGGER.buildAnyMessage("AUD001", `Error Publicando a Auditoria`,
                Utils.stringifyError(err)));
        }
        return messageID;
    }

    /**
     * Arma el mensaje a almacenar en auditoría para la acción de aprobación, rechazo o inactivación de un GE
     * @param {object} event
     * @param {string} operationName
     */
    buildAuditPayload(event, operationName, atribute, table, economicGroupDetail) {
        let token = Utils.getTokenInfoFromEvent(event);
        let actionUser = token.sub;
        let unixDate = Utils.getUnixDate();
        let response = {
            channel: token.aud,
            ip: event.headers['X-Forwarded-For'],
            originDB: Constants.AUDIT.ORIGIN_RDS,
            tableName: table,
            operationName: operationName,
            userModifies: actionUser,
            primaryKey: `${atribute}`,
            eventDate: unixDate,
            oldData: {}
        };
        if(token.groups && Array.isArray(token.groups)) {
            response.role = Utils.getRoles(token.groups)[0];
        }
        if(economicGroupDetail === Constants.AUDIT.COMMISSION.DETAIL) {
            response.tableName = Constants.AUDIT.COMMISSION.TABLE_NAME;
        } else if(economicGroupDetail){
            response.newData = economicGroupDetail
        }
        return response;
    }
}

module.exports = { AuditProvider };
