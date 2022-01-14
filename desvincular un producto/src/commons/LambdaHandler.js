"use strict";

const StatusCodes = require("./StatusCodes"),
    { generateResponse,INTERNAL_SERVER_ERROR } = require("./ResponseCreator"),
    { BaseObject } = require("./BaseObject");

class LambdaHandler extends BaseObject{

    constructor(traceID, controllerClass, method){
        super(traceID);
        this.controllerClass = controllerClass;
        this.method = method;
    }

    async handleRequest(event, context){
        configureHandler(event, context);
        if(event.awakenFunction){
           console.log("EGLH001", "Evento de Precalentamiento", "Evento:", event);
            return ;
        }else if(event === "Test Despliegue"){
            console.log("EGLH003", "Evento de Prueba de Despliegue", "Evento:");
            return;
        }
        let response;
        try{
            let controllerClassInstance = await this.controllerClass.create(this.traceID);
            response = await controllerClassInstance[this.method](event);
            console.log("pasa por aqui")
        }catch(error){
            response = handleError(this.traceID, error);
        }
        return response;
    }
}

function configureHandler(event, context){
    console.log("EGLH000", "Contexto Actualizado", "Contexto:", context);
}

function handleError(traceID, error){
    console.log("EGLH002", "", "Error:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    if(!error.statusCode){
        return generateResponse(traceID, INTERNAL_SERVER_ERROR, StatusCodes.JS_EXCEPTION)
    }else{
        return error;
    }
}

module.exports = {LambdaHandler};
