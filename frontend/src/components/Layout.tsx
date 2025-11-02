import { Link, useLocation } from 'react-router-dom';
import { WalletConnect } from './WalletConnect';
import { Home, LayoutGrid, Vote, User, Plus } from 'lucide-react';
import { useAccount } from 'wagmi';

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { isConnected } = useAccount();

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/projects', label: 'Projects', icon: LayoutGrid },
    { path: '/governance', label: 'Governance', icon: Vote },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">
                MilestoneFund
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex gap-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'text-primary bg-primary-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
              {isConnected && (
                <Link
                  to="/projects/create"
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4" />
                  Create Project
                </Link>
              )}
            </nav>

            {/* Wallet Connect */}
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-b border-gray-200">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 py-3 px-4 ${
                  isActive ? 'text-primary' : 'text-gray-600'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>? 2025 MilestoneFund. Built with ?? for transparent crowdfunding.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
