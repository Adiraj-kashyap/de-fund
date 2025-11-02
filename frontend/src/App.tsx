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
      retry: 1,
    },
  },
});

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
