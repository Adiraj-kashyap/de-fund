import { Link } from 'react-router-dom';
import { Clock, Target, TrendingUp } from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import { formatEther, formatTimeRemaining } from '../lib/utils';

interface ProjectCardProps {
  address: string;
  title: string;
  description: string;
  fundsRaised: bigint;
  fundingGoal: bigint;
  timeRemaining: bigint;
  currentStage: number;
  totalStages: number;
  image?: string;
}

export function ProjectCard({
  address,
  title,
  description,
  fundsRaised,
  fundingGoal,
  timeRemaining,
  currentStage,
  totalStages,
  image,
}: ProjectCardProps) {
  const percentage = Number(fundsRaised) / Number(fundingGoal) * 100;
  const isActive = timeRemaining > 0n;

  return (
    <Link to={`/project/${address}`}>
      <div className="card hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
        {/* Image */}
        {image ? (
          <img 
            src={image} 
            alt={title}
            className="w-full h-48 object-cover rounded-t-lg -mx-6 -mt-6 mb-4"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-primary-100 to-primary-200 rounded-t-lg -mx-6 -mt-6 mb-4 flex items-center justify-center">
            <Target className="w-16 h-16 text-primary-400" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 flex flex-col">
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
            {title}
          </h3>
          
          <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-1">
            {description}
          </p>

          {/* Stats */}
          <div className="space-y-4">
            {/* Progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-gray-900">
                  {formatEther(fundsRaised)} ETH
                </span>
                <span className="text-gray-500">
                  of {formatEther(fundingGoal)} ETH
                </span>
              </div>
              <ProgressBar 
                current={Number(fundsRaised)} 
                total={Number(fundingGoal)}
                showPercentage={false}
                size="sm"
              />
            </div>

            {/* Meta info */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <TrendingUp className="w-4 h-4" />
                <span>Stage {currentStage + 1}/{totalStages}</span>
              </div>
              <div className={`flex items-center gap-1 ${isActive ? 'text-success' : 'text-danger'}`}>
                <Clock className="w-4 h-4" />
                <span>{formatTimeRemaining(timeRemaining)}</span>
              </div>
            </div>

            {/* Badge */}
            <div>
              {percentage >= 100 ? (
                <span className="badge-success">Funded</span>
              ) : isActive ? (
                <span className="badge-primary">Active</span>
              ) : (
                <span className="badge-danger">Ended</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
