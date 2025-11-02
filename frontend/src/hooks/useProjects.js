import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/projects`)
      return response.data
    },
    staleTime: 30000, // 30 seconds
  })
}

export function useProject(address) {
  return useQuery({
    queryKey: ['project', address],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/projects/${address}`)
      return response.data
    },
    enabled: !!address,
    staleTime: 30000,
  })
}

export function useUserProjects(userAddress) {
  return useQuery({
    queryKey: ['projects', 'user', userAddress],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/projects/user/${userAddress}`)
      return response.data
    },
    enabled: !!userAddress,
    staleTime: 30000,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (projectData) => {
      const response = await axios.post(`${API_URL}/api/projects`, projectData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useProposals() {
  return useQuery({
    queryKey: ['proposals'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/proposals`)
      return response.data
    },
    staleTime: 10000, // 10 seconds (proposals change more frequently)
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}
