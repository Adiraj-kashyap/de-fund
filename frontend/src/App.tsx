import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { config } from './lib/wagmi';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { CreateProject } from './pages/CreateProject';
import { Governance } from './pages/Governance';
import { Profile } from './pages/Profile';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Don't retry on block tag errors - these are common in local dev
        if (error?.message?.includes('invalid block tag') || 
            error?.message?.includes('block number') ||
            error?.message?.includes('received invalid block')) {
          return false;
        }
        // Retry other errors once
        return failureCount < 1;
      },
      retryDelay: 1000,
      // Clear stale data more aggressively for localhost
      staleTime: 0, // Always consider data stale to force fresh fetches
      gcTime: 0, // Don't cache - always fetch fresh (for local dev)
    },
  },
});

// CRITICAL: Clear all caches on mount to prevent stale block number issues
// This happens when Hardhat resets and wagmi still has cached block 6 when only block 3 exists
if (typeof window !== 'undefined') {
  // Clear React Query cache
  queryClient.clear();
  
  // Also clear browser storage that might cache block numbers
  try {
    // Clear any localStorage items that might cache block info
    Object.keys(localStorage).forEach(key => {
      if (key.includes('wagmi') || key.includes('block') || key.includes('query')) {
        localStorage.removeItem(key);
      }
    });
    // Clear sessionStorage too
    Object.keys(sessionStorage).forEach(key => {
      if (key.includes('wagmi') || key.includes('block') || key.includes('query')) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (e) {
    // Ignore storage errors
  }
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/create" element={<CreateProject />} />
              <Route path="/project/:address" element={<ProjectDetail />} />
              <Route path="/governance" element={<Governance />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </Layout>
        </Router>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#10B981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
