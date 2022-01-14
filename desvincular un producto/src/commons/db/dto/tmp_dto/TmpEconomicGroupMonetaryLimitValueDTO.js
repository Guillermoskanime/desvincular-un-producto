"use strict";

const {BaseDTO} = require("../BaseDTO"),
    Sequelize = require("sequelize");

const TABLE_COLUMNS = {
        maxValue: {
            type: Sequelize.DECIMAL,
            allowNull: false,
            field: "max_value"
        },
        economicGroupMonetaryLimitID: {
            primaryKey: true,
            type: Sequelize.INTEGER,
            field: "economic_group_monetary_limit_id"
        },
        typeLimit: {
            type: Sequelize.ENUM("transaction", "daily", "monthly"),
            primaryKey: true,
            field: "type_limit"
        },
        economicGroupID: {
            type: Sequelize.INTEGER,
            allowNull: false,
            field: "economic_group_id"
        },
        minValue: {
            type: Sequelize.DECIMAL,
            allowNull: false,
            field: "min_value"
        }
    },
    TABLE_NAME = "tmp_economic_group_monetary_limit_value";


class TmpEconomicGroupMonetaryLimitValueDTO extends BaseDTO{

    constructor(traceID, connection) {
        super(traceID, connection, TABLE_NAME, TABLE_COLUMNS);
    }

}

module.exports = {
    TmpEconomicGroupMonetaryLimitValueDTO
};
