"use strict";

const { DataSource2 } = require("../DataSource2"),
    { BaseObject } = require("../../BaseObject");


class BaseDAO2 extends BaseObject {
    static persistentConnection = null;

    async initialize() {
        console.log("BDO000, Inicializando Conexion a BD");
        if (BaseDAO2.persistentConnection) {
            console.log("BDO001, Encontrada Conexion en Cache Lambda");
            try {
                console.log("BDO002, Probando Conexion");
                await BaseDAO2.persistentConnection.authenticate();
            } catch (error) {
                console.log("BDO003, Error en Conexion en Cache, Abriendo Nueva Conexion:" + error);
                BaseDAO2.persistentConnection = await DataSource2.openConnection(this.traceID, this.database);
            }
        } else {
            BaseDAO2.persistentConnection = await DataSource2.openConnection(this.traceID, this.database);
            console.log("PRUEBA0, Viasualizando Conexion a BD,persistentConnection : " + BaseDAO2.persistentConnection);
        }
        this.connection = BaseDAO2.persistentConnection;
    }

    async getConnection() {
        return this.connection;
    }

    async closeConnection() {
        await this.connection.close();
    }

    async executeTransaction(transactionBlock) {
        await this.initialize();
        return await this.connection.transaction(transactionBlock);
    }

}

module.exports = {
    BaseDAO2
};
