"use client";

import { createContext, useContext, MutableRefObject } from "react";

type MicRecorderContextValue = {
  start: () => Promise<void>;
  stop: () => void;
  requestFlush: () => void;
  elapsedRef: MutableRefObject<number>;
};

const noop = () => {};

export const MicRecorderContext = createContext<MicRecorderContextValue>({
  start: async () => {},
  stop: noop,
  requestFlush: noop,
  elapsedRef: { current: 0 },
});

export function useMicRecorderContext(): MicRecorderContextValue {
  return useContext(MicRecorderContext);
}
