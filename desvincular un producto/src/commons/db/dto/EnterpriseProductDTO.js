"use strict";

const {BaseDTO} = require("./BaseDTO"),
    Sequelize = require("sequelize");

const TABLE_COLUMNS = {
        productNumber: {
            type: Sequelize.STRING,
            field: "product_number",
            primaryKey: true
        },
        cisNumber: {
            type: Sequelize.INTEGER,
            field: "cis_number",
            allowNull: false
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false
        },
        currencyCode: {
            type: Sequelize.STRING,
            field: "currency_code",
            allowNull: false
        },
        productType: {
            type: Sequelize.STRING,
            field: "product_type",
            allowNull: false
        },
        productSubtype: {
            type: Sequelize.STRING,
            field: "product_subtype",
            allowNull: false
        }
    },
    TABLE_NAME = "enterprise_product";


class EnterpriseProductDTO extends BaseDTO {

    constructor(traceID, connection) {
        super(traceID, connection, TABLE_NAME, TABLE_COLUMNS);
    }

}

module.exports = {EnterpriseProductDTO};
