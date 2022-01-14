module.exports = Object.freeze({
	GENERAL: {
		API_DOMAIN: process.env.HOST,
		CHANNEL_LIMITS: process.env.CHANNEL_LIMITS,
	},
	PRODUCTS: {
		ALLOWED_PRODUCT_TYPES: ['DDA', 'TDC', 'CRE', 'CDA'],
	},
	PRODUCTS_STATUS: {
		ALLOWED_PRODUCT_STATUS: ['1', '01', '2', '02', '9', '09', '99', 'A', 'VI', 'VE'],
		ALLOWED_PRODUCT_STATUS_MAINTENANCE: ['1', '01', '2', '02', '9', '09', '99', 'A', 'VI', 'VE', '3', '03', '5', '05', '6', '06', '7', '07', '8', '08']	
	},
	CACHE: {
		SCOPES: {
			ALL: 'all',
		},
		CHANNELS: {
			MAC: 'mac',
			SVE: 'sve'
		},
		SERVICE_ENTERPRISES: 'getEGEnterprises',
		SERVICE_PRODUCTS_DETAIL: 'getEnterprisesProductsDetail',
		SERVICE_PRODUCTS: 'getEnterprisesProducts',
		SERVICE_PRODUCTS_LEGACY: 'getEnterprisesProductsLegacy',
		ENTITY_PRODUCTS: 'economicGroupsProducts',
		SERVICE_EG: 'getEconomicGroups',
		SERVICE_EG_DETAIL: 'getEconomicGroupDetail',
		SERVICE_ENTERPRISE_PRODUCTS: 'getProductsEnterprise',
		ENTITY: 'economicGroups',
		ENTITY_USERS: 'users',
		SERVICE_LIMITS: 'getEconomicGroupTransactionLimits',
		ENTITY_LIMITS: 'economicGroupsLimits',
		ATRIBUTE: 'economicGroupId',
		SERVICE_EG_DETAIL_TMP: 'getEconomicGroupDetailTmp',
		ENTITY_TMP: 'economicGroupsTmp',
		SERVICE_LIMITS_TMP: 'getEconomicGroupTransactionLimitsTmp',
		ENTITY_LIMITS_TMP: 'economicGroupsLimitsTmp',
		SERVICE_ENTERPRISES_TMP: 'getEGEnterprisesTmp',
		ENTITY_PRODUCTS_TMP: 'economicGroupsProductsTmp',
		SERVICE_PRODUCTS_DETAIL_TMP: 'getEnterprisesProductsDetailTmp',
		TTL: process.env.TTL ? parseInt(process.env.TTL, 10) : 86400,
		WILDCARD: '*',
		CONSOLIDATE_GET_ENTERPRISE_INFO_SERVICE: "getIdEntityFromGroupId",
		CONSOLIDATE_ENTITY: "GroupEconomic",
		USER_ENTITY: 'users',
		CACHE_SERVICE_GET_TRANSACTION_LIMITS_BY_ECONOMICGROUP: "getEconomicGroupTransactionLimits",
		CACHE_ENTITY_ECONOMICGROUP_LIMITS: "economicGroupsLimits",
	},
	DATABASE: {
		username: 'root',
		password :'guillermo',
		DB_SECRET_NAME: process.env.DB_SECRET_NAME,
		DB_SVE_SCHEMA: 'enterprises',
		DB_LOGGER_ENABLED: process.env.DB_LOGGER_ENABLED,
		DB_MAC_SCHEMA: process.env.DB_MAC_SCHEMA,
		CATALOGS: {
			TX_SUBTYPE_NAME: 'tx-sub-types',
			ENTERPRISES_PRODUCTS: 'enterprises-products'
		},
		TABLES: {
			DYNAMODB: {
				CATALOG_TABLE_NAME: 'catalog',
				TABLE_SERVCORE_CUSTOMER_PRODUCTS: 'servcore-customer-products',
				TABLE_INDEX_SERVCORE_CUSTOMER_PRODUCTS: 'product-index'
			},
		},
		QUERY: {
			CDA: {
				keyConditionExpression: 'product = :product and updatedAt >= :updatedAt', 
				expressionAttributeValues: {
					':product': 'CDA',
					':status1': '01',
					':status2': '02',
					':status3': '03',
					':status4': '09',
					':status5': '99',
					':updatedAt': '*!'
				},
				expressionAttributeNames: {
					'#status': 'status'
				},
				filterExpression: '#status <> :status1 and #status <> :status2 and #status <> :status3'
					+' and #status <> :status4 and #status <> :status5'
			},
			TDC: {
				keyConditionExpression: 'product = :product and updatedAt >= :updatedAt', 
				expressionAttributeValues: {
					product: 'TDC',
					status: 'A ',
					':updatedAt': '*!'
				},
				expressionAttributeNames: {
					'#status': 'status'
				},
				filterExpression: '#status <> :status'
			},
			CRE: {
				keyConditionExpression: 'product = :product and updatedAt >= :updatedAt', 
				expressionAttributeValues: {
					':product': 'CRE',
					':status1': '1',
					':status2': '2',
					':updatedAt': '*!'
				},
				expressionAttributeNames: {
					'#status': 'status'
				},
				filterExpression: '#status <> :status1 and #status <> :status2'
			}
		}
	},
	REGEX: {
		AMZ_TRACE_ID: /^(Root=\d-)+(.*)$/,
		UUID_V4: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
	},
	SQL: {
		PROCEDURES: {
			GET_STATUS_BY_ABBREVIATION: `CALL ${process.env.DB_MAC_SCHEMA}.sp_status_getByAbbreviature($abbreviation)`,
			GET_ECONOMIC_GROUP_DETAIL: `CALL SP_SVEECONOMICGORUPS_GET_ECONOMIC_GROUP_DETAIL($economicGroupID)`,
			GET_ECONOMIC_GROUP_DETAIL_TMP: `CALL SP_SVEECONOMICGORUPS_GET_ECONOMIC_GROUP_DETAIL_TMP($economicGroupID)`,
			GET_ECONOMIC_GROUP_TRANSACTION_LIMITS_BY_CHANNEL: `CALL SP_SVE_GET_ECONOMIC_GROUP_TRANSACTION_LIMITS_BY_CHANNEL($channelName, $economicGroupID)`,
			GET_ECONOMIC_GROUP_TRANSACTION_LIMITS_BY_CHANNEL_TMP: `CALL SP_SVE_GET_ECONOMIC_GROUP_TRANSACTION_LIMITS_BY_CHANNEL_TMP($channelName, $economicGroupID)`,
			APPROVE_REJECT_UPDATED_ECONOMIC_GROUP: `CALL SP_SVE_ECONOMICGROUP_APPROVEREJECTUPDATE($economicGroupID, $decision, $approver)`,
			COPY_ECONOMIC_GROUP_IMAGE_INTO_TMP_SP:
				`CALL sp_sve_economicgroups_copyImageIntoTmp($economicGroupID, $newStatus, $user` +
				`, $basicFlag, $limitsFlag, $enterprisesFlag, $commissionsFlag, $usersFlag)`,
			COPY_ECONOMIC_GROUP_TMP_INTO_PPAL_SP: `CALL sp_sve_economicGroup_copyTmpIntoPrincipal($economicGroupID, $user)`,
			INACTIVATE_ECONOMIC_GROUP: `CALL SP_SVE_ECONOMICGROUP_INACTIVATE($economicGroupID)`,
			SP_CALL_GET_CHANNEL_TRANSACTION_LIMITS: 'CALL mac.getTransactionLimitsByChannel(:channelName, :offsetValue, :limitValue)',
			SP_GET_STATUS_BY_ABBREVIATURE: 'CALL mac.sp_status_getByAbbreviature($in_abbreviature)',
			SP_GET_PENDING_REPLACE_MAIN_USERS: `CALL SP_SVE_GET_ECONOMIC_GROUP_PENDING_REPLACE_MAIN_USERS($in_filter,$in_limit,$in_offset,@out_total)`,
			SP_VALIDATE_EXIST_COMISSIONS: 'CALL enterprises.sp_sve_validate_exist_commissions($economicGroupId)',
			SELECT_TOTAL_QUERY: "SELECT @out_total",
		},
	},
	STATUS: {
		IN_CONSTRUCTION: 'IN_CONSTRUCTION',
		APPROVED: 'APPROVED',
		DELETED: 'DELETED',
		ACTIVE: 'ACTIVE',
		PENDING_APPROVAL: 'PENDING_APPROVAL',
		REJECTED: 'REJECTED',
		IN_VERIFICATION: 'IN_VERIFICATION',
		INACTIVE: 'INACTIVE'
	},
	LAMBDA: {
		LAMBDA_SYNC_EXECUTION: 'RequestResponse',
		LAMBDA_EXECUTION_TIMEOUT_MILLISECONDS: process.env.CHILD_LAMBDA_EXECUTION_TIMEOUT_MILISECONDS,
		LAMBDA_OPEN_ID: `security-${process.env.STAGE}-openid`,
		LAMBDA_FUNCTION_ADM_USERS_PROVIDER: process.env.LAMBDA_FUNCTION_ADM_USERS_PROVIDER,
		LAMBDA_FUNCTION_USERS_REGISTRATION_PROVIDER: process.env.LAMBDA_FUNCTION_USERS_REGISTRATION_PROVIDER,
		LAMBDA_SCHEDULER_CANCEL_EG_TX: process.env.LAMBDA_SCHEDULER_CANCEL_EG_TX,
		LAMBDA_USER_AGENT: 'lambda-invoke',
		LAMBDA_DEFAULT_ROLES_IDS: process.env.LAMBDA_DEFAULT_ROLES_IDS,
		LAMBDA_DETECT_ID_V2_UNREGISTER_DEVICES: process.env.LAMBDA_DETECT_ID_V2_UNREGISTER_DEVICES
	},
	SORT: {
		ALLOWED_FIELDS: ['type_desc', 'productType', 'productNumber', 'name', 'currencyCode'],
		VALID_DIRECTIONS: ['asc', 'desc'],
	},
	TOPICS: {
		TOPIC_DIGITAL_CHANNELS_TRANSACTIONS:
			`arn:aws:sns:${process.env.REGION}:` + `${process.env.AWS_ACCOUNT}:core-digital-channels-transactions-${process.env.STAGE}`,
		TOPIC_AUDIT: `arn:aws:sns:${process.env.REGION}:${process.env.AWS_ACCOUNT}:audit-${process.env.STAGE}-audit-topic`,
	},
	TIMEOUTS: {
		SNS_PUBLISH_TIMEOUT: process.env.SNS_PUBLISH_TIMEOUT,
	},
	PROFILES: {
		PRINCIPAL_ADMIN: 'USUP_ADM',
		PRINCIPAL_MONETARY: 'USUP_MON',
	},
	APPROVAL_DECISION: {
		APPROVE: 'APPROVE',
		REJECT: 'REJECT',
	},
	ADM_STATUS: {
		LOCKED: 'BLOQUEADO',
		ACTIVE: 'ACTIVO',
		INACTIVE: 'Inactivo',
	},
	AUDIT: {
		TABLE_NAME_PRODUCT_GROUP_DETAIL: 'PRODUCT_GROUP_DETAIL',
		TABLE_NAME: 'ECONOMIC_GROUP',
		TABLE_NAME_USER: 'USERS_ENTERPRISES',
		TABLE_ENTERPRISE_ECONOMIC_GROUP: 'ENTERPRISE_ECONOMIC_GROUP',
		TABLE_ENTERPRISE_PRODUCT: 'ENTERPRISE_PRODUCT',
		TABLE_ECONOMIC_GROUP_MONETARY_LIMIT: 'ECONOMIC_GROUP_MONETARY_LIMIT',
		ORIGIN_RDS: 'RDS',
		APPROVE_OPERATION: 'APPROVE',
		UPDATE_OPERATION: 'UPDATE',
		APPROVE_CREATION_OPERATION: 'APPROVE_EG_CREATION',
		REJECT_OPERATION: 'REJECT',
		INACTIVATE_OPERATION: 'INACTIVATE',
		QUERY_DETAIL_OPERATION: 'QUERY_DETAIL',
		REPLACE_OPERATION: "REPLACE",
		SELECT_OPERATION: 'SELECT',
		COMMISSION: {
			DETAIL: 'COMMISSION',
			TABLE_NAME: 'ECONOMIC_GROUP_COMMISSION'
		}
	},
	LIMITS_TYPE: {
		TRANSACTION: 'transaction',
		DAILY: 'daily',
		MONTHLY: 'monthly',
	},
	TRANSACTION_STATUS: {
		APPROVAL_TRANSACTION: 'PA',
		SCHEDULED: 'PG',
	},
	TYPE_APPROVAL: {
		DUAL: 'DUAL',
		UNIQUE: 'UNIQUE',
	},
	CHANNEL_ID: {
		MAC: 'adminCanales'
	},
	DB_MESSAGE: "Inicializando Modelos"
});
