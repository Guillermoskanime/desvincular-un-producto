exports.USER_RESPONSE_LAMBDA_CALL_ERROR = "USER_RESPONSE_LAMBDA_CALL_ERROR";
exports.USER_RESPONSE_LAMBDA_CALL_BAD_RESPONSE = "USER_RESPONSE_LAMBDA_CALL_BAD_RESPONSE";
exports.USER_PASSWORD = "USER_PASSWORD";
exports.TRACE_ID = "TRACE_ID";
exports.USER_EMAIL = "USER_EMAIL";
exports.USER_NAME = "USER_NAME";
exports.USER_ECONOMIC_GROUP_NAME = "USER_ECONOMIC_GROUP_NAME";
exports.USER_CREATED_BY = "USER_CREATED_BY";
exports.ADM_FUNCTION_NAME = "ADM_FUNCTION_NAME";
exports.USER_RESPONSE_LAMBDA_CALL_NO_ADM_RESPONSE = "USER_RESPONSE_LAMBDA_CALL_NO_ADM_RESPONSE";
exports.USER_RESPONSE_LAMBDA_CALL_EMPTY_ADM_RESPONSE = "USER_RESPONSE_LAMBDA_CALL_EMPTY_ADM_RESPONSE";
exports.USER_RESPONSE_LAMBDA_CALL_OK_ADM_RESPONSE = "USER_RESPONSE_LAMBDA_CALL_OK_ADM_RESPONSE";
exports.USER_RESPONSE_LAMBDA_CALL_OK_ADM_RESPONSE_NO_MESSAGE = "USER_RESPONSE_LAMBDA_CALL_OK_ADM_RESPONSE_NO_MESSAGE";
exports.LAMBDA_CALL_BAD_RESPONSE = {
    Payload: JSON.stringify({
        statusCode: 500
    })
};
exports.LAMBDA_CALL_NULL_ADM_MESSAGE = {
    Payload: JSON.stringify({
        statusCode: 200,
        body: JSON.stringify({
            ADMResponseCode: "01"
        })
    })
};
exports.LAMBDA_CALL_EMPTY_ADM_RESPONSE = {
    Payload: JSON.stringify({
        statusCode: 200,
        body: JSON.stringify({
            ADMMessage: "",
            ADMResponseCode: "01"
        })
    })
};
exports.LAMBDA_CALL_OK_ADM_RESPONSE = {
    Payload: JSON.stringify({
        statusCode: 200,
        body: JSON.stringify({
            ADMMessage: "",
            ADMResponseCode: "00"
        })
    })
};
exports.LAMBDA_CALL_OK_ADM_RESPONSE_NO_MESSAGE = {
    Payload: JSON.stringify({
        statusCode: 200,
        body: JSON.stringify({
            ADMResponseCode: "00"
        })
    })
};