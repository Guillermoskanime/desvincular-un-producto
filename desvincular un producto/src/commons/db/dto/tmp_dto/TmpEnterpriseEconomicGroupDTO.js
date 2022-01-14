"use strict";

const {
    BaseDTO
} = require("../BaseDTO"),
    Sequelize = require("sequelize");

const TABLE_COLUMNS = {
        cisNumber: {
            primaryKey: true,
            type: Sequelize.INTEGER,
            field: "cis_number"
        },
        economicGroupID: {
            type: Sequelize.INTEGER,
            field: "economic_group_id",
            allowNull: false
        },
        name: {
            type: Sequelize.STRING(),
            allowNull: false
        },
        address: {
            type: Sequelize.STRING,
            allowNull: true,
            field: "address"
        },
        phoneNumber: {
            type: Sequelize.STRING,
            allowNull: true,
            field: "phone_number"
        },
        lastModificationUser: {
            type: Sequelize.STRING,
            allowNull: false,
            field: "last_modification_user"
        },
        lastModificationDate: {
            type: Sequelize.DATE,
            allowNull: false,
            field: "last_modification_date",
            defaultValue: Date.now()
        }
    },
    TABLE_NAME = "tmp_enterprise_economic_group";


class TmpEnterpriseEconomicGroupDTO extends BaseDTO {

    constructor(traceID, connection) {
        super(traceID, connection, TABLE_NAME, TABLE_COLUMNS);
    }

}

module.exports = {
    TmpEnterpriseEconomicGroupDTO
};
