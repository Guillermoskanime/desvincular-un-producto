"use strict";

const LambdaProvider = require("../LambdaProvider").LambdaProvider,
    LOGGER = require("@com-banistmo/scg-ms-logs-node"),
    SERVICE_NAME = "Scheduler Lambda Provider",
    { generateResponse, INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, OK} = require("../../../ResponseCreator"),
    Constants = require("../../../Constants"),
    StatusCodes = require("../../../StatusCodes");

class SchedulerLambdaProvider extends LambdaProvider {
    async cancelEGTransactons(economicGroupID, event) {
        let payload = {
            headers: {
                "X-Amzn-Trace-Id": `1-${this.traceID}`,
                'X-Forwarded-For': event.headers['X-Forwarded-For'],
                'User-Agent': Constants.LAMBDA.LAMBDA_USER_AGENT,
                "Authorization": event.headers.Authorization
            },
            method: "PATCH",
            body: {
                "economicGroupId": Number(economicGroupID),
                "status": "SCHEDULED"
            },
            pathParameters: {},
            query: {}
        };
        let lambdaResponse;
        try {
            lambdaResponse = await this.callLambdaFunctionSync(Constants.LAMBDA.LAMBDA_SCHEDULER_CANCEL_EG_TX, payload);
            lambdaResponse = JSON.parse(lambdaResponse.Payload);
        } catch (error) {
            throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.LAMBDA_SCHEDULER_CANCEL_EG_TX_ERROR);
        }
        this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage(SERVICE_NAME, `Respuesta Lambda Cambio Status ADM`,
            "Respuesta: ", JSON.stringify(lambdaResponse)));
        if (lambdaResponse.statusCode !== OK) {
            throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.LAMBDA_SCHEDULER_CANCEL_EG_TX_ERROR);
        }
        lambdaResponse = lambdaResponse.body;
        return lambdaResponse;
    }

}

module.exports = { SchedulerLambdaProvider };
