"use strict";

const { SNSProvider } = require("../SNSProvider"),
  Constants = require("../../../Constants"),
  { Utils } = require("../../../Utils"),
  LOGGER = require("@com-banistmo/scg-ms-logs-node"),
  MOMENT = require("moment-timezone");

class AyNSNSProvider extends SNSProvider {
  async sendUserPreRegistrationEmail(headers, economicGroupID, userName, userLastName = "", userEmail) {
    let rqUID = Utils.generateUUIDv4();
    let snsPayload = {
      headers: headers,
      request: {
        rqUID: `1-${rqUID}`,
        dueDate: MOMENT().format(),
        parameters: {
          economic_group: economicGroupID,
          fullname: `${userName} ${userLastName}`,
        },
        extensions: [
          {
            idExtension: "aud",
            valueExtension: "sve",
          },
          {
            idExtension: "email_origin",
            valueExtension: userEmail,
          },
          {
            idExtension: "sub",
            valueExtension: "sve",
          },
          {
            idExtension: "economic_group",
            valueExtension: economicGroupID,
          },
          {
            idExtension: "fullname",
            valueExtension: `${userName} ${userLastName}`,
          },
          {
            idExtension: "originator_name",
            valueExtension: `${userName} ${userLastName}`,
          },
        ],
        channelId: "sve",
      },
      response: {
        rqUID: `1-${rqUID}`,
        status: {
          statusCode: 200,
          code: 200,
        },
      },
      transactionId: "SVER01",
    };
    let messageID;
    try {
      this.LOG.logging(LOGGER.LEVEL_DEBUG, Utils.buildAnyMessage("AYN000", `Preparacion para alertas y notificaciones`, "Data: ", snsPayload));
      messageID = await this.publishToSNS(Constants.TOPICS.TOPIC_DIGITAL_CHANNELS_TRANSACTIONS, snsPayload);
    } catch (error) {
      this.LOG.logging(LOGGER.LEVEL_ERROR, Utils.buildAnyMessage("AYN001", `Error Publicando a AyN`, Utils.stringifyError(error)));
    }
    return messageID;
  }
}

module.exports = {
  AyNSNSProvider,
};
