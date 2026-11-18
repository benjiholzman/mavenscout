import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import type { ApiRequest, ApiResponse } from './app'

export function toApiRequest(event: APIGatewayProxyEventV2): ApiRequest {
  const headers: Record<string, string | undefined> = {}
  for (const [k, v] of Object.entries(event.headers ?? {})) headers[k.toLowerCase()] = v
  const body =
    event.body == null ? null : event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body
  return { method: event.requestContext.http.method, path: event.rawPath, headers, body }
}

export function toHttpResponse(res: ApiResponse): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: res.status,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(res.body),
  }
}

export function internalError(): APIGatewayProxyStructuredResultV2 {
  return toHttpResponse({ status: 500, body: { error: 'internal_error', message: 'Unexpected error' } })
}
