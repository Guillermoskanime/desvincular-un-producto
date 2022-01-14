exports.TRACE_ID = "TRACE_ID";
exports.ECONOMIC_GROUP_ID = 1;
exports.ECONOMIC_GROUP_ID_ERROR = 2;

exports.LAMBDA_CALL_OK_RESPONSE = {
    Payload: JSON.stringify({
        statusCode: 200,
        body: JSON.stringify({
        })
    })
};