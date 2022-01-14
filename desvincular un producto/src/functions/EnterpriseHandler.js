const { EnterpriseProductsController } = require("./enterprise/products/EnterpriseProductsController"),
    {Utils} = require("../commons/Utils"),
    { LambdaHandler } = require("../commons/LambdaHandler");


module.exports.unlinkProductHandler = async(event, context) => {
    console.log("primer evento:" + event ,"segundo contexto :" + context);
    let lambdaHandler = new LambdaHandler(Utils.extractTraceID(event), EnterpriseProductsController, "unlinkProduct");
    
    let result = await lambdaHandler.handleRequest(event, context);
    console.log("respuesta del result ", result );
    return result;
};

