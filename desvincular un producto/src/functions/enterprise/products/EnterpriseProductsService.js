
const {BaseObject} = require("../../../commons/BaseObject"),
    { BatchUnlinkProductProvider } = require("../../../commons/AWS/DynamoDB/batch-unlink-product/BatchUnlinkProductProvider"),
    { generateResponse, INTERNAL_SERVER_ERROR } = require("../../../commons/ResponseCreator"),
    {Utils} = require("../../../commons/Utils"),
    moment = require("moment-timezone"),
    StatusCodes = require("../../../commons/StatusCodes");

class EnterpriseProductsService extends BaseObject{

    constructor(traceID, economicGroupProductsDao, enterpriseProductsDao){
        super(traceID);
        this.economicGroupProductsDao = economicGroupProductsDao;
        this.enterpriseProductsDao = enterpriseProductsDao;
    }

    
    async getCISAssociatedIDEconomicGroup(CISNumber){
        try{
            console.log ("entro en el getCISAssociatedIDEconomicGroup");
            console.log ("valor del cisnumber:",CISNumber);
            let enterpriseEconomicGroup =  await this.economicGroupProductsDao.findEnterpriseEconomicGroup(CISNumber);
            
            console.log(" EPS008, Resultado GE Asociado a CIS CISNumber:enterpriseEconomicGroup", JSON.stringify(enterpriseEconomicGroup));
            if(enterpriseEconomicGroup){
                return enterpriseEconomicGroup.economicGroupID
            }        
        }catch(error){
         console.log("EPS001 Error el detalle del CIS Error:",error);
        }
    }

    async getCustomerProducts(query){
        let products;
        try {
            const provider = new BatchUnlinkProductProvider();
            products = await provider.getCustomerProducts(this.putDate(query))
            return products;
        } catch (error) {
           console.log("EPS010 Error al consultar customer products... Error");
        }
    }

    putDate(type){
        const date = moment().subtract(1, "days").format("YYYY-MM-DD");
        const query = type;
        query.expressionAttributeValues[':updatedAt'] = date;
        return query;
    }

    async unlinkProcessService(query, event){
        const arrayTDC = await this.getCustomerProducts(query);
        if(arrayTDC){
            try {
                console.log("EPS012", "Size array", "products:", arrayTDC.length);
                arrayTDC.forEach(async customerProduct => {  
                    console.log("valor del parametro cis",customerProduct.cisnumber);
                    const economicGroup = await this.getCISAssociatedIDEconomicGroup(customerProduct.cisnumber); 
                    console.log("visualziacion del metodo  getcisaassociatedIDEconomicGroup", economicGroup);
                    let responde = await this.enterpriseProductsDao.unlinkProcess(event, customerProduct, economicGroup);
                    console.log("EPS012 visualziacion de unlinkProcess",responde);
                });   
            } catch (error) {
                console.log("Error Eliminando el producto del Grupo Economico o Error al guardar el producto del Grupo Economico en el historial, Error:" , error);
            }
        }
        return true;       
    }
}

module.exports = {
    EnterpriseProductsService
};
