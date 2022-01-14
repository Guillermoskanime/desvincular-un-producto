exports.CLASS_STUBS = {
    UTILS_MOCK: {
        Utils: class Utils {
            static stringifyError() {
                return true
            }
            static getTokenInfoFromEvent() {
                return {
                    sub: "test"
                }
            }
            static getUnixDate() {
                return true
            }
            static buildAnyMessage(code, message, detail, object) {
                return true
            }
            static generateUUIDv4() {
                return "67891233-abcdef012345678912345678";
            }
        }
    }
};
