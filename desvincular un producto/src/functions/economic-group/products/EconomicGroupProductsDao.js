'use strict';

const { BaseDAO2 } = require('../../../commons/db/dao/BaseDAO2'),
    { EnterpriseEconomicGroupDTO } = require('../../../commons/db/dto/EnterpriseEconomicGroupDTO'),
    { TmpEnterpriseEconomicGroupDTO } = require('../../../commons/db/dto/tmp_dto/TmpEnterpriseEconomicGroupDTO'),
    Sequelize = require('sequelize'),
    Constants = require('../../../commons/Constants');

class EconomicGroupProductsDao extends BaseDAO2 {
    constructor(traceID) {
        super(traceID);
        this.database = Constants.DATABASE.DB_SVE_SCHEMA;
    }

    async findEnterpriseEconomicGroup(CISNumber, transaction) {

        console.log("****************************database***********************************", this.database)

        console.log(" entro al findEnterpriseEconomicGroup");
      
        console.log('EGPD004', Constants.DB_MESSAGE)
        await this.initialize();
        console.log("probando si se entra a realizar  el initialize", CISNumber);
        let enterpriseEconomicGroupDTO = new EnterpriseEconomicGroupDTO(this.traceID, this.connection);
        let tmpEnterpriseEconomicGroupDTO = new TmpEnterpriseEconomicGroupDTO(this.traceID, this.connection);
        console.log("Buscando Empresa del Grupo Economico", CISNumber);
        let options = {};
        if (transaction) {
            options.transaction = transaction;
        }
        let enterpriseEconomicGroup =  enterpriseEconomicGroupDTO.model.findByPk(parseInt(CISNumber, 10) || -1, options).then(response => {
            console.log("************enterpriseEconomicGroup************",response.dataValues);//the object with the data I need
            return response.dataValues;
          });

       
        console.log("EGPD006, Busqueda Empresa del Grupo Economico exitosa', Resultado :", JSON.stringify(enterpriseEconomicGroup));
        if (!enterpriseEconomicGroup || !enterpriseEconomicGroup.cisNumber) {
            enterpriseEconomicGroup = await tmpEnterpriseEconomicGroupDTO.model.findByPk(parseInt(CISNumber, 10) || -1, options);
        }
        return enterpriseEconomicGroup;
      
    }

}

module.exports = {
    EconomicGroupProductsDao,
};
