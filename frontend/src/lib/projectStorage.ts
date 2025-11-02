/**
 * Project storage for local development
 * Stores project data in localStorage until backend is integrated
 */

export interface Project {
  id: string;
  contractAddress: `0x${string}`;
  ownerAddress: `0x${string}`;
  title: string;
  description: string;
  category: string;
  imageUrl?: string;
  fundingGoal: string; // In wei (stored as string)
  fundingDeadline: string; // Timestamp (stored as string)
  totalStages: number;
  createdAt: number;
  status: 'active' | 'funded' | 'cancelled' | 'completed';
  milestones: Milestone[];
}

export interface Milestone {
  stageIndex: number;
  title: string;
  description: string;
  allocationPercentage: number;
}

const STORAGE_KEY = 'de-fund-projects';

function getStoredProjects(): Project[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error reading projects from storage:', e);
    return [];
  }
}

function setStoredProjects(projects: Project[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Error saving projects to storage:', e);
  }
}

export function saveProject(project: Omit<Project, 'id' | 'createdAt'>): Project {
  const projects = getStoredProjects();
  const newProject: Project = {
    ...project,
    id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
  };
  
  projects.unshift(newProject); // Add to beginning
  setStoredProjects(projects);
  return newProject;
}

export function getAllProjects(): Project[] {
  return getStoredProjects();
}

export function getProjectById(id: string): Project | null {
  const projects = getStoredProjects();
  return projects.find(p => p.id === id) || null;
}

export function getProjectByAddress(address: string): Project | null {
  const projects = getStoredProjects();
  return projects.find(p => p.contractAddress.toLowerCase() === address.toLowerCase()) || null;
}

export function deleteProject(id: string): boolean {
  const projects = getStoredProjects();
  const filtered = projects.filter(p => p.id !== id);
  if (filtered.length !== projects.length) {
    setStoredProjects(filtered);
    return true;
  }
  return false;
}

