"use strict";

const {BaseDTO} = require("../BaseDTO"),
    Sequelize = require("sequelize");

const TABLE_COLUMNS = {
        economicGroupID: {
            type: Sequelize.INTEGER,
            allowNull: false,
            field: "economic_group_id"
        },
        id: {
            primaryKey: true,
            autoIncrement: true,
            type: Sequelize.INTEGER
        },
        lastModificationDate: {
            type: Sequelize.DATE,
            allowNull: false,
            field: "modification_date",
            defaultValue: Date.now()
        },
        lastModificationUser: {
            type: Sequelize.STRING,
            allowNull: false,
            field: "user_modifiles"
        },
        transactionGroupChannelID: {
            type: Sequelize.INTEGER,
            allowNull: false,
            field: "transaction_group_channel_id"
        }
    },
    TABLE_NAME = "tmp_economic_group_monetary_limit";


class TmpEconomicGroupMonetaryLimitDTO extends BaseDTO{

    constructor(traceID, connection) {
        super(traceID, connection, TABLE_NAME, TABLE_COLUMNS);
    }

}

module.exports = {
    TmpEconomicGroupMonetaryLimitDTO
};
