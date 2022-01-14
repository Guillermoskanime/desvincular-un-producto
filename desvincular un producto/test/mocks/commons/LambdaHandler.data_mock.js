exports.CONTROLLER = {
    create(traceID) {
        return {
            TEST_METHOD() {
                return {create: true};
            }
        };
    }
};
exports.CONTROLLER_ERROR = {
    create(traceID) {
        throw "ERROR";
    }
}
exports.TEST_TRACE_ID = "TEST_TRACE_ID";
exports.TEST_METHOD = "TEST_METHOD";