"use strict";

const Constants = require("./Constants"),
    JsonWebToken = require("jsonwebtoken"),
    { v4: uuidv4 } = require('uuid');
    uuidv4();

class Utils{

    static extractTraceID(event) {
        if (!event.headers || !event.headers["X-Amzn-Trace-Id"]) {
            return Utils.generateUUIDv4();
        }
        let amzIDHeader = String(event.headers["X-Amzn-Trace-Id"]);
        let match = amzIDHeader.match(Constants.REGEX.AMZ_TRACE_ID);
        if (!match || !match[2]) {
            return Utils.generateUUIDv4();
        }
        return match[2];
    }

    static generateUUIDv4() {
        return uuidv4();
    }

    static stringifyError(error){
        return JSON.stringify(error, Object.getOwnPropertyNames(error));
    }


    static getTokenFromEvent(event){
        if (!event.headers || !event.headers["Authorization"]) {
            return undefined;
        }
        return event.headers["Authorization"].split(/[Bb][Ee][Aa][Rr][Ee][Rr]\s/)[1];
    }

    static getTokenInfoFromEvent(event){
        return JsonWebToken.decode(Utils.getTokenFromEvent(event));
    }

    static generatePaginatedResponse(offset, limit, total, resultData){
        return {
            result_set:{
                count: parseInt(resultData.length, 10),
                offset: parseInt(offset, 10),
                limit: parseInt(limit,10),
                total: parseInt(total, 10)
            },
            result_data: Array.isArray(resultData) ? resultData : [resultData]
        }
    }

    static getUnixDate(){
        let date = new Date();
        return (date.getTime() / 1000) | 0;
    };

    static getRoles(groups) {
        let roles = [];
        if (!Array.isArray(groups)) {
            groups = [groups];
        }
        groups.forEach(group => {
            const role = group.split(',')[0].match(/(CN=)([^\s]+|$)/);
            if(role) {
                roles.push(role[2]);
            }
        });
        return roles;
    }

}

module.exports = { Utils };
