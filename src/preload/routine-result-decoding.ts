import {
  isNullableRoutineResultDestination,
  isRoutineResultConnectionOptions,
  isRoutineResultDeliveries,
} from "@codebot/contracts/ipc";
import { guardedDecoder } from "@codebot/contracts/ipc-decoding";

export const decodeRoutineResultOptions = guardedDecoder(
  isRoutineResultConnectionOptions,
  "routine result options response",
);
export const decodeRoutineResultDestination = guardedDecoder(
  isNullableRoutineResultDestination,
  "routine result destination response",
);
export const decodeRoutineResultDeliveries = guardedDecoder(
  isRoutineResultDeliveries,
  "routine result deliveries response",
);
