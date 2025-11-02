import { Link } from 'react-router-dom';
import { Rocket, Shield, Users, TrendingUp, ArrowRight } from 'lucide-react';

export function Home() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Fund Projects with{' '}
            <span className="text-primary">Confidence</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Milestone-based funding platform powered by blockchain. 
            Funds are released only when milestones are verified by the community.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/projects" className="btn-primary text-lg px-8 py-3">
              <Rocket className="w-5 h-5" />
              Explore Projects
            </Link>
            <Link to="/governance" className="btn-secondary text-lg px-8 py-3">
              <Users className="w-5 h-5" />
              Join Governance
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-8">
        <div className="card text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Secure Escrow
          </h3>
          <p className="text-gray-600">
            Funds are held in smart contract escrow until milestones are completed and verified.
          </p>
        </div>

        <div className="card text-center">
          <div className="w-16 h-16 bg-success-light rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-success-dark" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            DAO Governance
          </h3>
          <p className="text-gray-600">
            Community votes on milestone completion. Stake tokens to participate in governance.
          </p>
        </div>

        <div className="card text-center">
          <div className="w-16 h-16 bg-warning-light rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-warning-dark" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Full Transparency
          </h3>
          <p className="text-gray-600">
            All transactions on-chain. Track every contribution and fund release in real-time.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white rounded-2xl p-8 md:p-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          How It Works
        </h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="relative">
            <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xl mb-4">
              1
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Create Project</h4>
            <p className="text-sm text-gray-600">
              Define your project with clear milestones and funding allocation
            </p>
          </div>

          <div className="relative">
            <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xl mb-4">
              2
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Raise Funds</h4>
            <p className="text-sm text-gray-600">
              Donors contribute crypto to your project's smart contract escrow
            </p>
          </div>

          <div className="relative">
            <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xl mb-4">
              3
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Complete Milestones</h4>
            <p className="text-sm text-gray-600">
              Submit evidence of completion and create a governance proposal
            </p>
          </div>

          <div className="relative">
            <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xl mb-4">
              4
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Receive Funds</h4>
            <p className="text-sm text-gray-600">
              After community approval, funds are automatically released
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-primary to-primary-600 rounded-2xl p-8 md:p-12 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">
          Ready to Get Started?
        </h2>
        <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
          Join the future of transparent crowdfunding. Connect your wallet to start exploring projects.
        </p>
        <Link to="/projects" className="inline-flex items-center gap-2 bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors">
          View All Projects
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="text-center">
          <div className="text-4xl font-bold text-primary mb-2">100%</div>
          <div className="text-gray-600">On-Chain</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-primary mb-2">DAO</div>
          <div className="text-gray-600">Governed</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-primary mb-2">7d</div>
          <div className="text-gray-600">Voting Period</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-primary mb-2">51%</div>
          <div className="text-gray-600">Quorum</div>
        </div>
      </section>
    </div>
  );
}
