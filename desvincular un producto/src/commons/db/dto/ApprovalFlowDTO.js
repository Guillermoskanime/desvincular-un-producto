'use strict';

const { BaseDTO } = require('./BaseDTO'),
    Sequelize = require('sequelize');

const TABLE_COLUMNS = {
    id: {
        primaryKey: true,
        type: Sequelize.INTEGER,
        field: 'id',
        autoIncrement: true
    },
    economicGroupId: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'economic_group_id'
    },
    name: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'flow_name'
    },
    statusId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'status_id'
    }
},
    TABLE_NAME = 'approval_flow';

class ApprovalFlowDTO extends BaseDTO {
    constructor(traceID, connection) {
        super(traceID, connection, TABLE_NAME, TABLE_COLUMNS);
    }
}

module.exports = { ApprovalFlowDTO };