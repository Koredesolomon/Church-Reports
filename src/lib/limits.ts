/**
 * Vercel rejects any request or response body over about 4.5 MB, so attachments are limited to 4 MB in total per save.
 * (Larger files would need object storage such as Vercel Blob instead of the database.)
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "4 MB";
export const MAX_FILES_PER_REPORT = 10;
