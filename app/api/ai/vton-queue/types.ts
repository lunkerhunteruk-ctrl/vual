// Shared types for the VTON queue system

export interface VTONQueueRequestData {
  personImage: string;
  garmentImages: string[];
  categories: ('upper_body' | 'lower_body' | 'dresses' | 'footwear')[];
  mode?: 'standard' | 'high_quality' | 'add_item';
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

export interface VTONQueueItem {
  id: string;
  user_id: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  request_data: VTONQueueRequestData;
  result_data: VTONQueueResultData | null;
  error_message: string | null;
  queue_position: number;
  retry_count: number;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}
