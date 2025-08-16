// Define MCPResponse type with flexible properties
export type MCPResponse = {
  status: 'success' | 'error' | 'continue';
  message: string;
  nextStep?: string;
  callback?: string;
  data?: unknown;
  network?: string;
  executeNextStepAfter?: number;
  [key: string]: unknown;
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
  if (process.env.NODE_ENV !== 'test') {
    console.log('createSuccessResponse called with:', message);
  }
  if (typeof message === 'string') {
    const result = createResponse('success', message);
    if (process.env.NODE_ENV !== 'test') {
      console.log('createSuccessResponse string result:', result);
    }
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
    if (process.env.NODE_ENV !== 'test') {
      console.log('createSuccessResponse object result:', result);
    }
    return result;
  }
}
