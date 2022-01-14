"use strict";

const {BaseDTO} = require("./BaseDTO"),
    Sequelize = require("sequelize");

const TABLE_COLUMNS = {
        cisNumber: {
            primaryKey: true,
            type: Sequelize.INTEGER,
            field: "cis_number"
        },
        name: {
            type: Sequelize.STRING(),
            allowNull: false
        },
        economicGroupID: {
            type: Sequelize.INTEGER,
            field: "economic_group_id",
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
        creationUser: {
            type: Sequelize.STRING,
            allowNull: false,
            field: "creation_user"
        },
        creationDate: {
            type: Sequelize.DATE,
            allowNull: false,
            field: "creation_date",
            defaultValue: Date.now()
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
    TABLE_NAME = "enterprise_economic_group";


class EnterpriseEconomicGroupDTO extends BaseDTO {

    constructor(traceID, connection) {
        super(traceID, connection, TABLE_NAME, TABLE_COLUMNS);
    }

}

module.exports = {EnterpriseEconomicGroupDTO};
