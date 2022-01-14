const mongoose = require('mongoose');
const dato = require('./Modelos');

mongoose.connect('mongodb://localhost/DynamoDBSimulations')
.then(db => console.log('conectado a la base de datos de MongoDB'))
.catch(err => console.log(err));


class DynamoDBProvider{
    constructor(traceID){
        this.traceID=traceID;
      
    }

    async queryItemFromDDB(tableName, keyConditionExpression, expresionAttributeValues, limit, isAsc, expressionAttributeNames, filterExpression, indexName,lastEvaluatedKey){
        let queryPayload1 = {
            TableName: tableName,
            KeyConditionExpression: keyConditionExpression,
            ExpressionAttributeValues: expresionAttributeValues,
            ScanIndexForward: isAsc
        };


        const producto= queryPayload1.ExpressionAttributeValues.product;
        console.log("el producto es :" ,producto)


        let queryPayload2 = await dato.find({ $and: [
            { product: {$eq:producto } },
            { cisnumber: {$eq: 98804932} }
          ]});

        console.log("BFFP003', 'Query', 'Query que se ejecutara en dynamonDB.",  queryPayload1 );
        return queryPayload2;
    }
}

module.exports = { DynamoDBProvider };
