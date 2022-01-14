"use strict";

const LambdaProvider = require("../LambdaProvider").LambdaProvider,
    LOGGER = require("@com-banistmo/scg-ms-logs-node"),
    SERVICE_NAME = "Seed delete from detect id",
    { generateResponse, INTERNAL_SERVER_ERROR, UNPROCESSABLE_ENTITY, OK } = require("../../../ResponseCreator"),
    Constants = require("../../../Constants"),
    { Utils } = require("../../../Utils"),
    StatusCodes = require("../../../StatusCodes");

class DetectIDLambdaProvider extends LambdaProvider {
    async deleteSeed(username, headers) {
        let payload = {
            headers: {
                "X-Amzn-Trace-Id": `1-${this.traceID}`,
                "Authorization": headers.Authorization
            },
            httpMethod: "POST",
            body: {
                sveuser: "SVE-"+username
            },
            pathParameters: {},
            query: {},
            resource: "/v2/detectId/provisioning/unregister-devices"
        };
        let lambdaResponse;
        try {
            lambdaResponse = await this.callLambdaFunctionSync(Constants.LAMBDA.LAMBDA_DETECT_ID_V2_UNREGISTER_DEVICES, payload);
            this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage(SERVICE_NAME, `Respuesta Lambda Delete seed from detect id`,
                "Respuesta: ", lambdaResponse));
            lambdaResponse = JSON.parse(lambdaResponse.Payload);
            this.LOG.logging(LOGGER.LEVEL_DEBUG, LOGGER.buildAnyMessage(SERVICE_NAME, `Payload Lambda Delete seed from detect id`,
                "Payload: ", lambdaResponse));
        } catch (error) {
            this.LOG.logging(LOGGER.LEVEL_ERROR, LOGGER.buildAnyMessage(StatusCodes.DELETE_SEED_DETECT_ID_ERROR.code,
                StatusCodes.DELETE_SEED_DETECT_ID_ERROR.message,
                "Error: ", Utils.stringifyError(error)));
            throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.DELETE_SEED_DETECT_ID_ERROR);
        }
        return lambdaResponse;
    }

}

module.exports = { DetectIDLambdaProvider };
