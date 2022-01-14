module.exports = (function () {
    if (process.env.DISABLE_XRAY) {
        return {
            captureAWS (obj) {
                return obj;
            },
            captureAsyncFunc (segmentName, asyncFunc) {
                const mockSubSegment = {
                    close() { /* do nothing */ }
                };
                asyncFunc(mockSubSegment);
            }
        };
    } else {
        return require("aws-xray-sdk");
    }
})();
