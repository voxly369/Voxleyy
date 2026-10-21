export const MANUSCRIPT_MAX_FILE_BYTES = 10 * 1024 * 1024

export const MANUSCRIPT_FILE_TOO_LARGE = 'File is too large (max 10 MB).'

export function assertManuscriptFileSize(bytes: number): void {
  if (bytes > MANUSCRIPT_MAX_FILE_BYTES) {
    throw new Error(MANUSCRIPT_FILE_TOO_LARGE)
  }
}
