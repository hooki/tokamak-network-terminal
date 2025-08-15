// Define MCPResponse type
export type MCPResponse = {
  status: 'success' | 'error' | 'continue';
  message: string;
  [key: string]: any;
};

export function createMCPResponse(response: MCPResponse): string {
  return JSON.stringify(response);
}

/**
 * Create response content with status and message
 */
export function createResponse(
  status: 'success' | 'error' | 'continue',
  message: string
) {
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
export function createErrorResponse(message: string | MCPResponse) {
  if (typeof message === 'string') {
    return createResponse('error', message);
  } else {
    return {
      content: [
        {
          type: 'text' as const,
          text: createMCPResponse(message),
        },
      ],
    };
  }
}

/**
 * Create success response content
 */
export function createSuccessResponse(message: string | MCPResponse) {
  console.log('createSuccessResponse called with:', message);
  if (typeof message === 'string') {
    const result = createResponse('success', message);
    console.log('createSuccessResponse string result:', result);
    return result;
  } else {
    const result = {
      content: [
        {
          type: 'text' as const,
          text: createMCPResponse(message),
        },
      ],
    };
    console.log('createSuccessResponse object result:', result);
    return result;
  }
}
