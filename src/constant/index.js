export const API_LIST = Symbol("API_LIST");
export const CURRENT_API = Symbol("CURRENT_API");
export const JSON_PARAMS = Symbol("JSON_PARAMS");
export const FORMDATA_PARAMS = Symbol("FORMDATA_PARAMS");
export const FILE_PARAMS = Symbol("FILE_PARAMS");
export const PARAMS_TEXT = Symbol("PARAMS_TEXT");
export const INTERCEPT_ACTIVE = Symbol("INTERCEPT_ACTIVE");
export const INTERCEPT_API = Symbol("INTERCEPT_API");
export const RELEASE_API = Symbol("RELEASE_API");
export const RELEASE_ALL_API = Symbol("RELEASE_ALL_API");
export const NEXT_STEP = Symbol("NEXT_STEP");
export const KEY_WORD = Symbol("KEY_WORD");

export const ParamsTypeMap = {
  Json: "Json",
  FormData: "FormData",
  File: "File",
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
