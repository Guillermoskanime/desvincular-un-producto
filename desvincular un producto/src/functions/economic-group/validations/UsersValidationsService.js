"use strict";

const { BaseObject } = require("../../../commons/BaseObject"),
  { generateResponse, INTERNAL_SERVER_ERROR } = require("../../../commons/ResponseCreator"),
  StatusCodes = require("../../../commons/StatusCodes"),
  { Utils } = require("../../../commons/Utils"),
  Constants = require("../../../commons/Constants"),
  LOGGER = require("@com-banistmo/scg-ms-logs-node");

class UsersValidationsService extends BaseObject {
  constructor(traceID, economicGroupDao) {
    super(traceID);
    this.economicGroupDao = economicGroupDao;
  }

  async validations(economicGroupUsers, basicData, economicGroupId, replaceUserFlag = true) {
    this.LOG.logging(
      LOGGER.LEVEL_INFO,
      LOGGER.buildAnyMessage("EGVU001", "Inicio de validacíon de Usuarios", "DATA: ", {
        economicGroupUsers,
        basicData,
        economicGroupId,
        replaceUserFlag,
      })
    );
		let userDB,
			deletedStatus,
      arrayError = [];
    arrayError = this.validationsUser(basicData, economicGroupUsers, replaceUserFlag, arrayError);

    ({ userDB, deletedStatus, arrayError } = await this.mapUsersErros(economicGroupUsers, userDB, deletedStatus, economicGroupId, arrayError));
    return arrayError;
  }

  async mapUsersErros(economicGroupUsers, userDB, deletedStatus, economicGroupId, arrayError) {
    for (let i = 0; i < economicGroupUsers.length; i++) {
      try {
        userDB = await this.economicGroupDao.getUsers(economicGroupUsers[i]);
        deletedStatus = await this.economicGroupDao.getStatusByAbbreviation(Constants.STATUS.DELETED);
      }
      catch (error) {
        this.LOG.logging(LOGGER.LEVEL_ERROR, LOGGER.buildAnyMessage("EGVU004", "Error Obteniendo usuario", "Error:", Utils.stringifyError(error)));
        throw generateResponse(this.traceID, INTERNAL_SERVER_ERROR, StatusCodes.ERROR_GETTING_OIDC_USER_INFO);
      }
      if (userDB.count > 0) {
        for (let e = 0; e < userDB.rows.length; e++) {
          this.LOG.logging(
            LOGGER.LEVEL_DEBUG,
            LOGGER.buildAnyMessage("EGVU005", "Validacion info de usuarios", "Data:", {
              economicGroupId,
              userDBEconomicGroupId: userDB.rows[e].economicGroupId,
              newUserId: economicGroupUsers[i].id,
              userDBId: userDB.rows[e].id,
              deletedStatus
            })
          );
          if (economicGroupId.toString() === userDB.rows[e].economicGroupId && userDB.rows[e].statusID !== deletedStatus.id && economicGroupUsers[i].id !== userDB.rows[e].id) {
            this.LOG.logging(
              LOGGER.LEVEL_ERROR,
              LOGGER.buildAnyMessage(
                StatusCodes.VALIDATE_USERS_EG_USER_ALREADY_IN_USE.code,
                "Error Uno de los usuarios ya existe en BD.",
                "Error:",
                "User: " + JSON.stringify(economicGroupUsers[i])
              )
            );
            let errorTmp = StatusCodes.VALIDATE_USERS_EG_USER_ALREADY_IN_USE;
            errorTmp.detail = { userName: economicGroupUsers[i].userName, userLastName: economicGroupUsers[i].userLastName };
            arrayError = [...arrayError, ...[Object.assign({}, errorTmp)]];
          }
        }
      }
    }
    return { userDB, deletedStatus, arrayError };
  }

  validationsUser(basicData, economicGroupUsers, replaceUserFlag, arrayError) {
    if (basicData &&
      (basicData.adminApproval === Constants.TYPE_APPROVAL.DUAL || basicData.monetaryApproval === Constants.TYPE_APPROVAL.DUAL) &&
      economicGroupUsers.length !== 2 &&
      replaceUserFlag) {
      this.LOG.logging(
        LOGGER.LEVEL_ERROR,
        LOGGER.buildAnyMessage("EGVU002", "Error se necesitan dos usuarios", "Users:", JSON.stringify(economicGroupUsers))
      );
      let errorTmp = StatusCodes.VALIDATE_USERS_TYPE_APPROVAL;
      arrayError = [...arrayError, ...[Object.assign({}, errorTmp)]];
    }
    if (basicData &&
      basicData.monetaryApproval === Constants.TYPE_APPROVAL.DUAL &&
      economicGroupUsers.length === 2 &&
      (!economicGroupUsers[0].transactionsAccess || !economicGroupUsers[1].transactionsAccess) &&
      replaceUserFlag) {
      this.LOG.logging(
        LOGGER.LEVEL_ERROR,
        LOGGER.buildAnyMessage("EGVU003", "Error se necesitan dos usuarios con aprobación monetaria.", "Users:", JSON.stringify(economicGroupUsers))
      );
      let errorTmp = StatusCodes.VALIDATE_USERS_BOTH_USERS_MOTETARY_APPROVERS;
      arrayError = [...arrayError, ...[Object.assign({}, errorTmp)]];
    }
    return arrayError;
  }
}

module.exports = {
  UsersValidationsService,
};
