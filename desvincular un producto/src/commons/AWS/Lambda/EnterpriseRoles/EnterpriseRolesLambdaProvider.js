const LambdaProvider = require("../LambdaProvider").LambdaProvider,
  { generateResponse, BAD_REQUEST, INTERNAL_SERVER_ERROR } = require("../../../ResponseCreator"),
  LOGGER = require("@com-banistmo/scg-ms-logs-node"),
  Constants = require("../../../Constants"),
  StatusCodes = require("../../../StatusCodes");

class EnterpriseRolesLambdaProvider extends LambdaProvider {
  /**
   * Obtiene los ids del rol por defecto para usuarios principales
   * @param {*} event
   */
  async getDefaultRolesIds(headers, economicGroupId, baseProfileIndicator) {
    let lambdaResponse = null;
    let payload = {
      headers: {
        "X-Amzn-Trace-Id": `1-${this.traceID}`,
        "User-Agent": Constants.LAMBDA.LAMBDA_USER_AGENT,
        "X-Forwarded-For": headers["X-Forwarded-For"],
        Authorization: headers.Authorization
      },
      method: "POST",
      body: {
        economicGroupId: economicGroupId.toString(),
        baseProfileIndicator: baseProfileIndicator
      },
      path: {},
      query: {}
    };
    try {
      lambdaResponse = await this.callLambdaFunctionSync(Constants.LAMBDA.LAMBDA_DEFAULT_ROLES_IDS, payload);
      this.LOG.logging(
        LOGGER.LEVEL_DEBUG,
        LOGGER.buildAnyMessage("LAMBDA01", "Respuesta de la función lambda Ids del roles por defecto", "lambdaResponse", lambdaResponse)
      );
    } catch (error) {
      this.LOG.logging(
        LOGGER.LEVEL_ERROR,
        LOGGER.buildValidationMessage(
          "LAMBDA51",
          "There was an internal error in the getDefaultRolesIds method of EconomicGroupLambdaProvider",
          String(error),
          error
        )
      );
    }
    lambdaResponse = JSON.parse(lambdaResponse.Payload);
    this.LOG.logging(
      LOGGER.LEVEL_DEBUG,
      LOGGER.buildAnyMessage("LAMBDA01", "Respuesta de la función lambda Ids del roles por defecto", "lambdaResponse", lambdaResponse)
    );
    return lambdaResponse;
  }
}

module.exports = {
  EnterpriseRolesLambdaProvider
};
