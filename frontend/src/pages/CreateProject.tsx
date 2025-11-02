import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { Upload, Plus, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function CreateProject() {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'technology',
    fundingGoal: '',
    duration: '30',
    totalStages: '5',
    image: null as File | null,
  });

  const [milestones, setMilestones] = useState([
    { title: 'Milestone 1', description: '', allocation: '20' },
    { title: 'Milestone 2', description: '', allocation: '20' },
    { title: 'Milestone 3', description: '', allocation: '20' },
    { title: 'Milestone 4', description: '', allocation: '20' },
    { title: 'Milestone 5', description: '', allocation: '20' },
  ]);

  const categories = [
    'technology',
    'art',
    'music',
    'film',
    'games',
    'education',
    'health',
    'environment',
    'community',
    'other',
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, image: e.target.files![0] }));
    }
  };

  const handleMilestoneChange = (index: number, field: string, value: string) => {
    const newMilestones = [...milestones];
    newMilestones[index] = { ...newMilestones[index], [field]: value };
    setMilestones(newMilestones);
  };

  const addMilestone = () => {
    if (milestones.length < 7) {
      setMilestones([...milestones, { title: `Milestone ${milestones.length + 1}`, description: '', allocation: '0' }]);
    }
  };

  const removeMilestone = (index: number) => {
    if (milestones.length > 3) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!formData.title || !formData.description || !formData.fundingGoal) {
        toast.error('Please fill in all required fields');
        return false;
      }
      if (parseFloat(formData.fundingGoal) <= 0) {
        toast.error('Funding goal must be greater than 0');
        return false;
      }
    }

    if (step === 2) {
      const totalAllocation = milestones.reduce((sum, m) => sum + parseFloat(m.allocation || '0'), 0);
      if (Math.abs(totalAllocation - 100) > 0.01) {
        toast.error('Total allocation must equal 100%');
        return false;
      }
      if (milestones.some(m => !m.title)) {
        toast.error('All milestones must have a title');
        return false;
      }
    }

    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!validateStep(2)) {
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Deploy smart contract with formData
      // TODO: Upload image to IPFS
      // TODO: Call backend API to store project metadata
      
      // Mock successful submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Project created successfully!');
      navigate('/projects');
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="card text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Connect Your Wallet
        </h2>
        <p className="text-gray-600">
          Please connect your wallet to create a project
        </p>
      </div>
    );
  }

  const totalAllocation = milestones.reduce((sum, m) => sum + parseFloat(m.allocation || '0'), 0);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Create New Project
        </h1>
        <p className="text-lg text-gray-600">
          Launch your milestone-based funding campaign
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step === currentStep
                    ? 'bg-primary text-white'
                    : step < currentStep
                    ? 'bg-success text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step}
              </div>
              {step < 3 && (
                <div className={`w-16 h-1 ${step < currentStep ? 'bg-success' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-16 mt-2">
          <span className={`text-sm ${currentStep === 1 ? 'text-primary font-medium' : 'text-gray-500'}`}>
            Basic Info
          </span>
          <span className={`text-sm ${currentStep === 2 ? 'text-primary font-medium' : 'text-gray-500'}`}>
            Milestones
          </span>
          <span className={`text-sm ${currentStep === 3 ? 'text-primary font-medium' : 'text-gray-500'}`}>
            Review
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <label className="label">Project Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Community Solar Power Initiative"
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe your project, goals, and impact..."
                className="input h-32"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="label">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="input"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Funding Goal (ETH) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="fundingGoal"
                  value={formData.fundingGoal}
                  onChange={handleInputChange}
                  placeholder="10"
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Funding Duration (days)</label>
                <input
                  type="number"
                  min="1"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Total Milestones (3-7)</label>
                <input
                  type="number"
                  min="3"
                  max="7"
                  name="totalStages"
                  value={formData.totalStages}
                  onChange={(e) => {
                    handleInputChange(e);
                    const num = parseInt(e.target.value);
                    if (num >= 3 && num <= 7) {
                      const newMilestones = Array.from({ length: num }, (_, i) => ({
                        title: `Milestone ${i + 1}`,
                        description: '',
                        allocation: (100 / num).toFixed(2),
                      }));
                      setMilestones(newMilestones);
                    }
                  }}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="label">Project Image</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {formData.image ? formData.image.name : 'Click to upload project image'}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 10MB</p>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Milestones */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                Define Milestones
              </h3>
              {milestones.length < 7 && (
                <button
                  type="button"
                  onClick={addMilestone}
                  className="btn-secondary"
                >
                  <Plus className="w-4 h-4" />
                  Add Milestone
                </button>
              )}
            </div>

            <div className={`p-4 rounded-lg ${totalAllocation === 100 ? 'bg-success-light' : 'bg-warning-light'}`}>
              <p className="text-sm font-medium">
                Total Allocation: {totalAllocation.toFixed(2)}% of 100%
              </p>
            </div>

            {milestones.map((milestone, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-semibold text-gray-900">
                    Milestone {index + 1}
                  </h4>
                  {milestones.length > 3 && (
                    <button
                      type="button"
                      onClick={() => removeMilestone(index)}
                      className="text-danger hover:bg-danger-light p-2 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <input
                    type="text"
                    value={milestone.title}
                    onChange={(e) => handleMilestoneChange(index, 'title', e.target.value)}
                    placeholder="Milestone title"
                    className="input"
                  />

                  <textarea
                    value={milestone.description}
                    onChange={(e) => handleMilestoneChange(index, 'description', e.target.value)}
                    placeholder="Describe what needs to be completed..."
                    className="input h-20"
                  />

                  <div>
                    <label className="label">Allocation (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={milestone.allocation}
                      onChange={(e) => handleMilestoneChange(index, 'allocation', e.target.value)}
                      className="input"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Review */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Review Your Project
            </h3>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-700">Title</h4>
                <p className="text-gray-900">{formData.title}</p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700">Description</h4>
                <p className="text-gray-900">{formData.description}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-700">Funding Goal</h4>
                  <p className="text-gray-900">{formData.fundingGoal} ETH</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700">Duration</h4>
                  <p className="text-gray-900">{formData.duration} days</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700">Category</h4>
                  <p className="text-gray-900 capitalize">{formData.category}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700">Milestones</h4>
                  <p className="text-gray-900">{milestones.length} stages</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Milestones</h4>
                <div className="space-y-2">
                  {milestones.map((milestone, index) => (
                    <div key={index} className="flex justify-between p-3 bg-gray-50 rounded">
                      <span>{milestone.title}</span>
                      <span className="font-medium text-primary">{milestone.allocation}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="btn-secondary"
            >
              Previous
            </button>
          )}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="btn-primary ml-auto"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary ml-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Project...
                </>
              ) : (
                'Create Project'
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
