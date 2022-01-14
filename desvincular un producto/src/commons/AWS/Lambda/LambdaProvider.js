"use strict";

const { BaseObject } = require("../../BaseObject"),
    LOGGER = require('@com-banistmo/scg-ms-logs-node'),
    Constants = require("../../Constants"),
    XRAY = require("../X-Ray/XRAYWrapper"),
    AWS = XRAY.captureAWS(require("aws-sdk"));

class LambdaProvider extends BaseObject{

    constructor(traceID){
        super(traceID);
        this.lambdaClient = new AWS.Lambda();
    }

    callLambdaFunctionSync(functionName, payload) {
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage("URLP002", "Preparando Invocacion Lambda Sincrona",
            `Función: ${JSON.stringify(functionName)}`, `Payload: ${JSON.stringify(payload)}`));
        let lambdaInvocationParameters = buildLambdaParameters(functionName, Constants.LAMBDA.LAMBDA_SYNC_EXECUTION ,payload);
        this.LOG.logging(LOGGER.LEVEL_INFO, LOGGER.buildAnyMessage("URLP003", "Invocando Funcion Lambda",
            `Función: `, `${JSON.stringify(functionName)}`));
        let timeoutPromise = new Promise((resolve, reject) => {
            let timeoutID = setTimeout(() => {
                clearTimeout(timeoutID);
                reject(`Lambda: ${functionName} Timed Out after ${Constants.LAMBDA.LAMBDA_EXECUTION_TIMEOUT_MILLISECONDS} Milliseconds`);
            }, Constants.LAMBDA.LAMBDA_EXECUTION_TIMEOUT_MILLISECONDS);
        });
        return Promise.race([timeoutPromise, this.lambdaClient.invoke(lambdaInvocationParameters).promise()]);
    }

}

function buildLambdaParameters(functionName, invocationType, payload) {
    return {
        FunctionName : functionName,
        LogType: "None",
        InvocationType: invocationType,
        Payload: JSON.stringify(payload)
    };
}

module.exports = {
    LambdaProvider
};
