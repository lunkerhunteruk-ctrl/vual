// VTON Queue Client Library
// Provides easy-to-use functions for interacting with the VTON queue system

export interface VTONQueueRequest {
  personImage: string;
  garmentImages: string[];
  categories: ('upper_body' | 'lower_body' | 'dresses' | 'footwear')[];
  mode?: 'standard' | 'high_quality' | 'add_item';
  userId?: string;
}

export interface VTONQueueResultItem {
  resultImage: string;
  category: string;
  processingTime: number;
  confidence: number;
}

export interface VTONQueueResultData {
  results: VTONQueueResultItem[];
  totalProcessingTime: number;
}

export interface VTONQueueItemStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  position: number;
  itemsAhead: number;
  resultData: VTONQueueResultData | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  estimatedWaitTime: number;
}

export interface VTONQueueAddResponse {
  success: boolean;
  queueId?: string;
  position?: number;
  itemsAhead?: number;
  estimatedWaitTime?: number;
  message?: string;
  error?: string;
}

export interface VTONQueueStatusResponse {
  success: boolean;
  item?: VTONQueueItemStatus;
  error?: string;
}

export interface VTONQueueStats {
  pending: number;
  processing: number;
  estimatedWaitTime: number;
}

// Add a new item to the VTON queue
export async function addToVTONQueue(request: VTONQueueRequest): Promise<VTONQueueAddResponse> {
  try {
    const response = await fetch('/api/ai/vton-queue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to add to queue',
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Check the status of a queue item
export async function checkVTONQueueStatus(queueId: string): Promise<VTONQueueStatusResponse> {
  try {
    const response = await fetch(`/api/ai/vton-queue?id=${encodeURIComponent(queueId)}`);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to check status',
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Get queue statistics
export async function getVTONQueueStats(): Promise<{ success: boolean; stats?: VTONQueueStats; error?: string }> {
  try {
    const response = await fetch('/api/ai/vton-queue');
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to get queue stats',
      };
    }

    return {
      success: true,
      stats: data.stats,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Cancel a pending queue item
export async function cancelVTONQueueItem(queueId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/ai/vton-queue?id=${encodeURIComponent(queueId)}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to cancel queue item',
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Poll for queue item completion with callback
export interface VTONPollOptions {
  pollInterval?: number; // Default: 3000ms
  maxPollTime?: number; // Default: 300000ms (5 minutes)
  onProgress?: (status: VTONQueueItemStatus) => void;
}

export async function pollVTONQueueUntilComplete(
  queueId: string,
  options: VTONPollOptions = {}
): Promise<VTONQueueItemStatus> {
  const {
    pollInterval = 3000,
    maxPollTime = 300000,
    onProgress,
  } = options;

  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        // Check if we've exceeded max poll time
        if (Date.now() - startTime > maxPollTime) {
          reject(new Error('Polling timeout exceeded'));
          return;
        }

        const response = await checkVTONQueueStatus(queueId);

        if (!response.success || !response.item) {
          reject(new Error(response.error || 'Failed to get status'));
          return;
        }

        const status = response.item;

        // Call progress callback if provided
        if (onProgress) {
          onProgress(status);
        }

        // Check if processing is complete
        if (status.status === 'completed' || status.status === 'failed') {
          resolve(status);
          return;
        }

        // Continue polling
        setTimeout(poll, pollInterval);
      } catch (error) {
        reject(error);
      }
    };

    // Start polling
    poll();
  });
}

// Simplified function to submit and wait for VTON results
export async function submitAndWaitForVTON(
  request: VTONQueueRequest,
  options: VTONPollOptions = {}
): Promise<{
  success: boolean;
  results?: VTONQueueResultItem[];
  error?: string;
  queueId?: string;
}> {
  // Add to queue
  const addResponse = await addToVTONQueue(request);

  if (!addResponse.success || !addResponse.queueId) {
    return {
      success: false,
      error: addResponse.error || 'Failed to add to queue',
    };
  }

  try {
    // Poll until complete
    const finalStatus = await pollVTONQueueUntilComplete(addResponse.queueId, options);

    if (finalStatus.status === 'completed' && finalStatus.resultData) {
      return {
        success: true,
        results: finalStatus.resultData.results,
        queueId: addResponse.queueId,
      };
    }

    return {
      success: false,
      error: finalStatus.errorMessage || 'Processing failed',
      queueId: addResponse.queueId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Polling error',
      queueId: addResponse.queueId,
    };
  }
}
