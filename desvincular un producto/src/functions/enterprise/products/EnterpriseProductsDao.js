const { BaseDAO } = require('../../../commons/db/dao/BaseDAO'),
    { EnterpriseProductDTO } = require('../../../commons/db/dto/EnterpriseProductDTO'),
    { ProductGroupDetailDTO } = require('../../../commons/db/dto/ProductGroupDetailDTO'),
    Sequelize = require('sequelize'),
    {Utils} = require("../../../commons/Utils"),
    // { AuditProvider } = require('../../../commons/AWS/SNS/audit/AuditProvider'),
    moment = require("moment-timezone"),
    Constants = require('../../../commons/Constants');
const { HistoryProductDTO } = require('../../../commons/db/dto/HistoryProductDTO');

class EnterpriseProductsDao extends BaseDAO {

    constructor(traceID) {
        super(traceID);
        this.database = Constants.DATABASE.DB_SVE_SCHEMA;
    }

    async unlinkProcess(event, customerProduct, economicGroup){
        let transaction;

        // let auditProvider = new AuditProvider(this.traceID, economicGroup);

        try {
            // transaction = await this.connection.transaction({
            //     autocommit: false,
            //     isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
            // });
            console.log("****************************************************************************************")
            await this.saveHistory(customerProduct, transaction);
            await this.elimateOneProductGroupDetail(customerProduct.account,customerProduct.product,transaction);
            await this.eliminateOneEnterpriseProduct(customerProduct.cisnumber,customerProduct.account,transaction);
            await transaction.commit();  

            let detail = {
                description: `Actualización de producto automáticamente-${customerProduct.account}-${customerProduct.product}-${moment().format("YYYY-MM-DD")}`               
            }
            
            // await auditProvider.sendUpdateGEAuditMessage(event, economicGroup, detail);
        } catch (error) {
            if (transaction) {
                transaction.rollback();
            }
            console.log(("EPD08", "Error en el proceso de desvinculación", Utils.stringifyError(error)));
            throw error;
        }
        console.log(("EPD09", "Proceso de desvinculación exitoso", Utils.stringifyError(customerProduct)));
        return true;
    }


    async saveHistory(customersProduct, transaction) {
        console.log('EPD05', Constants.DB_MESSAGE);
        await this.initialize();
        console.log("**************************pasooo*******************");
        try {        
            let historyProductDTO = new HistoryProductDTO(this.traceID, this.connection);
            console.log('EPD06', 'Guardando el producto eliminado en el historial', 'Empresa:', JSON.stringify(customersProduct));
            const productHistory = await historyProductDTO.model.create(
                {
                    cis: customersProduct.cisnumber,
                    productNumber: customersProduct.account,
                    dateUnlinking: moment().format("YYYY-MM-DD"),
                    productType: customersProduct.product,
                    status: customersProduct.status,
                },
                {
                    transaction: transaction,
                }
            );

       console.log('EPD07','Dato del historico','Producto:', JSON.stringify(productHistory));
        } catch (error) {
            console.log("error ****" , error);
            
        }
        
    }

    async elimateOneProductGroupDetail(productNumber, productType, transaction) {
        console.log('EPD03', Constants.DB_MESSAGE);
        await this.initialize();
        console.log("**************************pasooo*******************");

        let productGroupDetailDTO = new ProductGroupDetailDTO(this.traceID, this.connection);
        console.log('EPD04', 'Eliminando el detalle de un Grupo Economico', 'Tipo de producto:', JSON.stringify(productType));
        await productGroupDetailDTO.model.destroy({
            where: {
                productNumber: productNumber,
                productType: productType,
            },
            transaction: transaction
        });

        console.log("**************************finalizo*******************");
    }

    async eliminateOneEnterpriseProduct(CISNumber, productNumber, transaction) {
        console.log(('EPD01', Constants.DB_MESSAGE));
        await this.initialize();
        console.log("**************************pasooo*******************");

        let enterpriseProductDTO = new EnterpriseProductDTO(this.traceID, this.connection);
        console.log('EPD02', 'Eliminando un producto de la Empresa del Grupo Economico', 'Empresa:', JSON.stringify(CISNumber));
        await enterpriseProductDTO.model.destroy({
            where: {
                cisNumber: CISNumber,
                productNumber: productNumber,
            },
            transaction: transaction
        });
        console.log("**************************finalizo*******************");

    }
}

module.exports = {
    EnterpriseProductsDao,
};