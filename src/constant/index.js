export const API_LIST = "API_LIST";
export const CURRENT_API = "CURRENT_API";
export const JSON_PARAMS = "JSON_PARAMS";
export const FORMDATA_PARAMS = "FORMDATA_PARAMS";
export const PARAMS_TYPE = "PARAMS_TYPE";
export const PARAMS_TEXT = "PARAMS_TEXT";
export const INTERCEPT_ACTIVE = "INTERCEPT_ACTIVE";
export const INTERCEPT_API = "INTERCEPT_API";
export const RELEASE_API = "RELEASE_API";
export const RELEASE_ALL_API = "RELEASE_ALL_API";
export const NEXT_STEP = "NEXT_STEP";

export const ParamsTypeMap = {
  Json: "Json",
  FormData: "FormData",
};

/**
 * 0未操作
 * 1请求拦截
 * 2响应拦截
 */
export const ActionStatusMap = {
  normal: 0,
  req: 1,
  res: 2,
};
