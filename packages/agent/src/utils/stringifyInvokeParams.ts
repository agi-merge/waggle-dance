/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-explicit-any */
// packages/agent/src/utils/stringifyInvokeParams.ts
import {
  stringifyByMime
  
  
} from "./mimeTypeParser";
import type {DisplayMimeTypes, ParseableMimeTypes} from "./mimeTypeParser";

export function stringifyInvokeParams(
  returnType: ParseableMimeTypes | DisplayMimeTypes,
  params: any,
): any {
  const stringifiedParams: any = {};

  for (const key in params) {
    stringifiedParams[key] = stringifyByMime(returnType, params[key]);
  }

  return stringifiedParams;
}
