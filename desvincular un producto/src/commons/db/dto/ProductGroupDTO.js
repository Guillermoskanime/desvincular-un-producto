'use strict';

const { BaseDTO } = require('./BaseDTO'),
    Sequelize = require('sequelize');

const TABLE_COLUMNS = {
    productGroupId: {
        primaryKey: true,
        type: Sequelize.INTEGER,
        field: 'id',
    },
    economicGroupId: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'enterprise_group_id',
    },
    name: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'name',
    },
    description: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'description',
    },
    status: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'status',
    }
},
    TABLE_NAME = "product_group";

class ProductGroupDTO extends BaseDTO {
    constructor(traceID, connection) {
        super(traceID, connection, TABLE_NAME, TABLE_COLUMNS);
    }
}

module.exports = { ProductGroupDTO };
