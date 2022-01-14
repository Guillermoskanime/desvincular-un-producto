exports.VALUE_MOCKS = {
    SECOND_MATCH: "23456789",
    TOKEN: "TOKEN"
};

exports.OBJECT_MOCKS = {
    EMPTY_OBJECT: {},
    EVENT_WITHOUT_X_AMZN_TRACE_ID: {
        headers: {}
    },
    EVENT_WITHOUT_VALID_X_AMZN_TRACE_ID: {
        headers: {
            "X-Amzn-Trace-Id" : "INVALID_X_AMZN_TRACE_ID"
        }
    },
    EVENT_WITHOUT_VALID_X_AMZN_TRACE_ID_SECOND_MATCH: {
        headers: {
            "X-Amzn-Trace-Id" : "Root=1-"
        }
    },
    EVENT_WITH_VALID_X_AMZN_TRACE_ID_SECOND_MATCH: {
        headers: {
            "X-Amzn-Trace-Id" : `Root=1-${exports.VALUE_MOCKS.SECOND_MATCH}`
        }
    },
    EVENT_WITH_TOKEN: {
        headers: {
            Authorization: `Bearer ${exports.VALUE_MOCKS.TOKEN}`
        }
    }
};
