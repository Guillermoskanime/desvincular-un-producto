'use strict';

const { BaseDTO } = require('./BaseDTO'),
	Sequelize = require('sequelize');

const TABLE_COLUMNS = {
		id: {
			primaryKey: true,
			autoIncrement: true,
			type: Sequelize.INTEGER,
		},
		cis: {
			type: Sequelize.INTEGER,
			field: 'cis',
			allowNull: false 
		},
        productNumber: {
			type: Sequelize.STRING,
			field: 'product_number',
		},
		dateUnlinking: {
			type: Sequelize.DATE,
			field: 'date_unlinking',
		},
		productType: {
			type: Sequelize.STRING,
			field: 'product_type',
		},
        status: {
			type: Sequelize.STRING,
			field: 'status',
		},
	},
	TABLE_NAME = 'history_product';

class HistoryProductDTO extends BaseDTO {
	constructor(traceID, connection) {
		super(traceID, connection, TABLE_NAME, TABLE_COLUMNS);
	}
}

module.exports = { HistoryProductDTO };
