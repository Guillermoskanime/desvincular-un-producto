const { BaseObject } = require("../../../commons/BaseObject"),
    { generateResponse, NOT_FOUND, OK } = require("../../../commons/ResponseCreator"),
    StatusCodes = require("../../../commons/StatusCodes"),
    Constants = require("../../../commons/Constants"),
    { EnterpriseProductsService } = require("./EnterpriseProductsService"),
    { EconomicGroupProductsDao } = require("../../economic-group/products/EconomicGroupProductsDao"),
    { EnterpriseProductsDao } = require("./EnterpriseProductsDao");


 class EnterpriseProductsController extends BaseObject {

    static async create(traceID) {
        let enterpriseProductsController = new EnterpriseProductsController(traceID);
        await enterpriseProductsController.initialize();
        return enterpriseProductsController;
       
    }

    async initialize() {
        console.log(" Guillemro");
        let economicGroupProductsDao = new EconomicGroupProductsDao(this.traceID);
        await economicGroupProductsDao.initialize();
        let  enterpriseProductsDao = new EnterpriseProductsDao(this.traceID);
        await enterpriseProductsDao.initialize();
        this.enterpriseProductsService = new EnterpriseProductsService(this.traceID, economicGroupProductsDao,enterpriseProductsDao);
    }
 
    async unlinkProduct(event){       
        await Promise.all([this.enterpriseProductsService.unlinkProcessService(Constants.DATABASE.QUERY.TDC, event)]);
            // this.enterpriseProductsService.unlinkProcessService(Constants.DATABASE.QUERY.CDA, event),
            // this.enterpriseProductsService.unlinkProcessService(Constants.DATABASE.QUERY.CRE, event)]);
        return generateResponse(this.traceID, OK, StatusCodes.SUCCESSFUL_OPERATION, null, null);
    }
      
}

module.exports = {
    EnterpriseProductsController
};
