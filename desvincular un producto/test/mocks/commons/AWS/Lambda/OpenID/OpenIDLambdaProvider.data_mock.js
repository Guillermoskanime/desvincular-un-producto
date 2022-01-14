exports.TRACE_ID = "TRACE_ID";
exports.OPENID_LAMBDA_CALL_OK_RESPONSE = "OPENID_LAMBDA_CALL_OK_RESPONSE";
exports.OPENID_LAMBDA_CALL_FAIL_RESPONSE = "OPENID_LAMBDA_CALL_FAIL_RESPONSE";

exports.LAMBDA_CALL_OK_OPENID_RESPONSE = {
    Payload: JSON.stringify({
        statusCode: 200,
        body: JSON.stringify({
            UsersRegistrationMessage: "",
            UsersRegistrationResponseCode: "00"
        })
    })
};