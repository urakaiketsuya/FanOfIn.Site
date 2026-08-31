export class ApiError extends Error {
  constructor(
    public readonly publicMessage: string,
    public readonly status: number,
    public readonly code: string,
    options?: ErrorOptions,
  ) {
    super(publicMessage, options);
    this.name = "ApiError";
  }
}

export function badRequest(message: string, code = "invalid_request"): ApiError {
  return new ApiError(message, 400, code);
}
