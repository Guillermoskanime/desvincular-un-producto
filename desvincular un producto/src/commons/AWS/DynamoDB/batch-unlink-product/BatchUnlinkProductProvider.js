const Constants = require("../../../Constants");
const { DynamoDBProvider } = require("../DynamoDBProvider");

class BatchUnlinkProductProvider extends DynamoDBProvider{

    async getCustomerProducts(options){
        let items = [];
        let lastEvaluatedKey = null
        let queryResult
        try {
            do {
                queryResult = await this.queryItemFromDDB(
                    Constants.DATABASE.TABLES.DYNAMODB.TABLE_SERVCORE_CUSTOMER_PRODUCTS,
                    options.keyConditionExpression,
                    options.expressionAttributeValues,
                    undefined, 
                    true,
                    options.expressionAttributeNames,
                    options.filterExpression,
                    Constants.DATABASE.TABLES.DYNAMODB.TABLE_INDEX_SERVCORE_CUSTOMER_PRODUCTS,
                    lastEvaluatedKey
                );
                lastEvaluatedKey = queryResult.LastEvaluatedKey
                console.log("que trae el query : ",queryResult ) ;
                items = items.concat(queryResult)
            } while (lastEvaluatedKey);
           

        } catch (error) {
           console.log("BFFP001 Obteniendo Registros de customs products", error);
        }

        console.log("'BFFP002', 'Consulta', 'Se realiza consulta de customs products', items", items);
        return items.length ? items : undefined
    }
}

module.exports = {
    BatchUnlinkProductProvider
}