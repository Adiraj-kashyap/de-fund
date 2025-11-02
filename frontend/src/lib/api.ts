/**
 * API client for backend communication
 * Handles project creation, fetching, and other API calls
 */

const API_BASE_URL = import.meta.env.VITE_BACKEND_API || 'http://localhost:3001';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    limit: number;
    offset: number;
    total: number;
  };
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      const error = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      // Preserve additional fields from backend error response
      (error as any).suggestion = errorData.suggestion;
      (error as any).hint = errorData.hint;
      (error as any).details = errorData.details;
      throw error;
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error(`API request failed (${endpoint}):`, error);
    return {
      success: false,
      error: error.message || 'Network error',
      suggestion: error.suggestion,
      hint: error.hint,
      details: error.details,
    };
  }
}

export interface BackendProject {
  id: number;
  contract_address: string;
  owner_address: string;
  title: string;
  description: string;
  category: string;
  image_url?: string;
  funding_goal: string; // Numeric string in wei
  funding_deadline: string; // Timestamp string
  total_stages: number;
  status: string;
  created_at: string;
  milestones?: BackendMilestone[];
  funds_raised?: string;
  donor_count?: number;
}

export interface BackendMilestone {
  id: number;
  project_id: number;
  stage_index: number;
  title: string;
  description: string;
  allocation_percentage: number;
  status: string;
}

// Projects API
// Note: contract_address is optional - if provided, manual deployment is used; otherwise backend auto-deploys
export async function createProject(projectData: {
  contract_address?: string; // Optional: for manual deployment
  owner_address: string; // Project creator's wallet (gets 20% stake automatically)
  title: string;
  description: string;
  category: string;
  image_url?: string;
  funding_goal: string;
  funding_deadline: string;
  total_stages: number;
  milestones: Array<{
    stage_index: number;
    title: string;
    description: string;
    allocation_percentage: number;
  }>;
}): Promise<ApiResponse<BackendProject>> {
  return apiRequest<BackendProject>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(projectData),
  });
}

export async function getAllProjects(params?: {
  status?: string;
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<BackendProject[]>> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.category) queryParams.append('category', params.category);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const queryString = queryParams.toString();
  return apiRequest<BackendProject[]>(`/api/projects${queryString ? `?${queryString}` : ''}`);
}

export async function getProjectById(id: number): Promise<ApiResponse<BackendProject>> {
  return apiRequest<BackendProject>(`/api/projects/${id}`);
}

export async function getProjectByAddress(address: string): Promise<ApiResponse<BackendProject>> {
  return apiRequest<BackendProject>(`/api/projects/contract/${address}`);
}

// Check if backend is available
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

// Deploy project contract
export async function deployProjectContract(projectData: {
  projectOwner: string;
  fundingGoal: string; // wei
  fundingDuration: string; // seconds
  totalStages: number;
  stageAllocations: number[]; // basis points
}): Promise<ApiResponse<{ contractAddress: string }>> {
  return apiRequest<{ contractAddress: string }>('/api/deploy/project', {
    method: 'POST',
    body: JSON.stringify(projectData),
  });
}

// Update project contract address (for manually deployed contracts)
export async function updateProjectContractAddress(
  currentAddress: string,
  newContractAddress: string
): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/api/projects/contract/${currentAddress}/update-contract`, {
    method: 'PATCH',
    body: JSON.stringify({ contractAddress: newContractAddress }),
  });
}

