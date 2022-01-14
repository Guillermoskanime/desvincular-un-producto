"use strict";

const Sequelize = require("sequelize"),
    {BaseObject} =require("../../BaseObject") ;

class BaseDTO extends BaseObject{

    constructor(traceID, connection, tableName, tableColumns){
        super(traceID);
        this.model = class BaseClass extends Sequelize.Model{};
        let options = {
            sequelize: connection,
            modelName: tableName
        };
        this.model.init(
            tableColumns,
            options
        );
    }
}

module.exports = {
    BaseDTO
};
