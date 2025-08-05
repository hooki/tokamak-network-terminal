export function createMCPResponse(response: MCPResponse): string {
  return JSON.stringify(response);
}

/**
 * Create response content with status and message
 */
export function createResponse(status: 'success' | 'error', message: string) {
  return {
    content: [
      {
        type: 'text' as const,
        text: createMCPResponse({
          status,
          message,
        }),
      },
    ],
  };
}

/**
 * Create error response content
 */
export function createErrorResponse(message: string) {
  return createResponse('error', message);
}

/**
 * Create success response content
 */
export function createSuccessResponse(message: string) {
  return createResponse('success', message);
}
