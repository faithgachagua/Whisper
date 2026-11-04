export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public extra?: Record<string, unknown>) {
    super(message);
  }
}
export const badRequest = (message: string, code = 'BAD_REQUEST', extra?: Record<string, unknown>) => new HttpError(400, code, message, extra);
export const unauthorized = (message = 'Please log in to continue.') => new HttpError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'You do not have access to this.', code = 'FORBIDDEN') => new HttpError(403, code, message);
export const notFound = (message = 'Not found.') => new HttpError(404, 'NOT_FOUND', message);
export const conflict = (message: string, code = 'CONFLICT') => new HttpError(409, code, message);
