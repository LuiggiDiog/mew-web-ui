"use client";

import { sileo } from "sileo";
import type { SileoOptions } from "sileo";

// Convenience wrapper around Sileo — ready for Phase 2 usage
export function useToast() {
  return {
    success: (opts: SileoOptions) => sileo.success(opts),
    error: (opts: SileoOptions) => sileo.error(opts),
    info: (opts: SileoOptions) => sileo.info(opts),
    warning: (opts: SileoOptions) => sileo.warning(opts),
    dismiss: (id: string) => sileo.dismiss(id),
    clear: () => sileo.clear(),
  };
}
