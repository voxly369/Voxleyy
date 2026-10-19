export type ProviderErrorLike = {
  code?: string
  message?: string
  status?: number
}

export function providerFields(error: ProviderErrorLike | null | undefined): {
  providerCode?: string
  providerStatus?: number
} {
  if (!error) return {}
  const providerCode = error.code && error.code.length > 0 ? error.code : undefined
  const providerStatus = typeof error.status === 'number' ? error.status : undefined
  return {
    ...(providerCode ? { providerCode } : {}),
    ...(providerStatus !== undefined ? { providerStatus } : {}),
  }
}
