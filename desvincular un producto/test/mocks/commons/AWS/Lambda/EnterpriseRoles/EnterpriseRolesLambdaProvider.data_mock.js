exports.TRACE_ID = "TRACE_ID";
exports.ENTERPRISE_ROLES_LAMBDA_CALL_OK_RESPONSE = "ENTERPRISE_ROLES_LAMBDA_CALL_OK_RESPONSE";
exports.ENTERPRISE_ROLES_LAMBDA_CALL_FAIL_RESPONSE = "ENTERPRISE_ROLES_LAMBDA_CALL_FAIL_RESPONSE";

exports.LAMBDA_CALL_OK_ENTERPRISE_ROLES_RESPONSE = {
    Payload: JSON.stringify({
        statusCode: 200,
        body: JSON.stringify({
            UsersRegistrationMessage: "",
            UsersRegistrationResponseCode: "00"
        })
    })
};