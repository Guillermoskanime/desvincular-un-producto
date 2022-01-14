exports.TRACE_ID = "TRACE_ID";
exports.USER_RESPONSE_LAMBDA_CALL_OK_USERS_REGISTRATION_RESPONSE = "USER_RESPONSE_LAMBDA_CALL_OK_USERS_REGISTRATION_RESPONSE";
exports.USER_RESPONSE_LAMBDA_CALL_FAIL_USERS_REGISTRATION_RESPONSE = "USER_RESPONSE_LAMBDA_CALL_FAIL_USERS_REGISTRATION_RESPONSE";
exports.USER_RESPONSE_LAMBDA_CALL_OK_WITH_ERRORS_USERS_REGISTRATION_RESPONSE = "USER_RESPONSE_LAMBDA_CALL_OK_WITH_ERRORS_USERS_REGISTRATION_RESPONSE";

exports.LAMBDA_CALL_OK_USERS_REGISTRATION_RESPONSE = {
    Payload: JSON.stringify({
        statusCode: 200,
        body: JSON.stringify({
            UsersRegistrationMessage: "",
            UsersRegistrationResponseCode: "00"
        })
    })
};

exports.LAMBDA_CALL_FAIL_USERS_REGISTRATION_RESPONSE = {
    Payload: JSON.stringify({
        statusCode: 500,
        errorMessage: '{\"status\": {\"statusCode\": 500} }',
        body: JSON.stringify({
            UsersRegistrationMessage: "",
            UsersRegistrationResponseCode: "00"
        })
    })
};