import {
  isCrmActivityPage,
  isCrmApplyResult,
  isCrmCustomerPage,
  isCrmOverview,
  isCrmPaymentPage,
  isCrmSettings,
} from "@codebot/contracts/ipc";
import { guardedDecoder } from "@codebot/contracts/ipc-decoding";

export const decodeRemoteCrmOverview = guardedDecoder(isCrmOverview, "remote CRM overview");
export const decodeRemoteCrmCustomerPage = guardedDecoder(isCrmCustomerPage, "remote CRM customers");
export const decodeRemoteCrmPaymentPage = guardedDecoder(isCrmPaymentPage, "remote CRM payments");
export const decodeRemoteCrmActivityPage = guardedDecoder(isCrmActivityPage, "remote CRM activity");
export const decodeRemoteCrmApplyResult = guardedDecoder(isCrmApplyResult, "remote CRM change result");
export const decodeRemoteCrmSettings = guardedDecoder(isCrmSettings, "remote CRM settings");
