"use strict";

const { BaseObject } = require("../../BaseObject"),
    Constants = require("../../Constants"),
    { Utils } = require("../../Utils"),
    LOGGER = require("@com-banistmo/scg-ms-logs-node"),
    XRAY = require("../X-Ray/XRAYWrapper"),
    AWS = XRAY.captureAWS(require("aws-sdk"));

class SNSProvider extends BaseObject{

    constructor(traceID){
        super(traceID);
        this.SNS = new AWS.SNS();
    }

    buildSNSParameters(topicARN, payload) {
        this.LOG.logging(LOGGER.LEVEL_INFO,
            Utils.buildAnyMessage("SNS000", "Construyendo Parametros SNS"));
        return {
            TopicArn : topicARN,
            Message: JSON.stringify(payload)
        };
    }

    publishToSNS(topicARN, payload){
        this.LOG.logging(LOGGER.LEVEL_DEBUG,
            Utils.buildAnyMessage("SNS001", "Preparando Publicacion a SNS",
                `Topico: ${JSON.stringify(topicARN)}, Payload: ${JSON.stringify(payload)}`));
        let SNSPublishParameters = this.buildSNSParameters(topicARN, payload);
        this.LOG.logging(LOGGER.LEVEL_INFO,
            Utils.buildAnyMessage("SNS002", "Publicando a SNS",
                `Función: ${JSON.stringify(topicARN)}` ));
        let timeoutPromise = new Promise((resolve, reject) => {
            let timeoutID = setTimeout(() => {
                clearTimeout(timeoutID);
                reject(`SNS: ${topicARN} Timed Out after ${Constants.TIMEOUTS.SNS_PUBLISH_TIMEOUT} Milliseconds`);
            }, Constants.TIMEOUTS.SNS_PUBLISH_TIMEOUT);
        });
        return Promise.race([timeoutPromise, this.SNS.publish(SNSPublishParameters).promise()]);
    }

}

module.exports = {
    SNSProvider
};
