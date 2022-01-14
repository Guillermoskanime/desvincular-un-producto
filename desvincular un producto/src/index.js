const events = require('../test/mocks/commons/event/events'),
context = require('../test/mocks/commons/context/context.json'),
EnterpriseHandler = require('../src/functions/EnterpriseHandler')


// funcion de llamado 

async function llamado() {
  let response = await  EnterpriseHandler.unlinkProductHandler(events.logEvent, context);
  console.log ("la repsuesta : ", response);
}

llamado();



