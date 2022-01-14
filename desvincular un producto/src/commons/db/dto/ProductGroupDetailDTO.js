'use strict';

const { BaseDTO } = require('./BaseDTO'),
	Sequelize = require('sequelize');

const TABLE_COLUMNS = {
		id: {
			primaryKey: true,
			autoIncrement: true,
			type: Sequelize.INTEGER,
		},
		productGroupId: {
			type: Sequelize.INTEGER,
			field: 'product_group_id',
			allowNull: false,
		},
		productNumber: {
			type: Sequelize.STRING,
			field: 'product_id',
		},
		productType: {
			type: Sequelize.STRING,
			field: 'product_type',
		},
	},
	TABLE_NAME = 'product_group_detail';

class ProductGroupDetailDTO extends BaseDTO {
	constructor(traceID, connection) {
		super(traceID, connection, TABLE_NAME, TABLE_COLUMNS);
	}
}

module.exports = { ProductGroupDetailDTO };
