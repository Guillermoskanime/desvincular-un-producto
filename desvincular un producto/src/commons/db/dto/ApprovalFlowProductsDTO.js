'use strict';

const { BaseDTO } = require('./BaseDTO'),
	Sequelize = require('sequelize');

const TABLE_COLUMNS = {
		id: {
			primaryKey: true,
			type: Sequelize.INTEGER,
			field: 'id',
			autoIncrement: true,
		},
		approvalFlowId: {
			type: Sequelize.INTEGER,
			allowNull: false,
			field: 'approval_flow_id',
		},
		productId: {
			type: Sequelize.STRING,
			allowNull: false,
			field: 'product_id',
		},
	},
	TABLE_NAME = 'approval_flow_product';

class ApprovalFlowProductsDTO extends BaseDTO {
	constructor(traceID, connection) {
		super(traceID, connection, TABLE_NAME, TABLE_COLUMNS);
	}
}

module.exports = { ApprovalFlowProductsDTO };

