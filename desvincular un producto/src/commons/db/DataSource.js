"use strict";

const Sequelize = require("sequelize"),
    Constants = require("../Constants");
   
class DataSource{

    static async openConnection(traceID, database){
        const DBInfo = Constants.DATABASE;
        try{
            
            console.log("***************************punto de partida **********************")
            console.log("DS003 Obteniendo Secreto", "Nombre del Secreto ");
        }catch (error) {
           console.log("DS001 Error al obtener los Secretos de conexion a la De, Error:" , error);
        }
        try{
           console.log("Conectando A DB, Schema: enterprises" );
            return new Sequelize(database, DBInfo.username, DBInfo.password, {
                host: 'localhost',
                port: '3306',
                dialect: 'mysql',
                pool: {
                    max: 1,
                    min: 0,
                    acquire: 10000,
                    idle: 10000,
                    evict: 15000
                },
                define: {
                    timestamps: false,
                    freezeTableName: true
                }
            });
        }catch (error) {
           console.log("Error Conectando a la DB Error:" , error);
        }
    }
}

module.exports = {
    DataSource
};
