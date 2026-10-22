import { providerFields } from '../supabaseFailure.ts'
import type { SafetyApiError, SafetyResult } from './types.ts'

export function safetyFail(
  code: SafetyApiError['code'],
  message: string,
  error?: { code?: string; message?: string; status?: number },
): { ok: false; error: SafetyApiError } {
  return {
    ok: false,
    error: {
      code,
      message,
      ...providerFields(error),
    },
  }
}

export function mapReportInsertError(message: string): SafetyApiError['code'] {
  if (message.includes('already reported')) return 'duplicate'
  if (message.includes('daily report limit')) return 'rate_limited'
  if (message === '42501' || message.toLowerCase().includes('forbidden')) return 'forbidden'
  return 'unavailable'
}

export function isSafetyFailure<T>(value: SafetyResult<T>): value is { ok: false; error: SafetyApiError } {
  return !value.ok
}
