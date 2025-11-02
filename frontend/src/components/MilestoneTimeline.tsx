import { Check, Clock, Lock } from 'lucide-react';

interface Milestone {
  stage: number;
  name: string;
  allocation: number;
  completed: boolean;
}

interface MilestoneTimelineProps {
  milestones: Milestone[];
  currentStage: number;
}

export function MilestoneTimeline({ milestones, currentStage }: MilestoneTimelineProps) {
  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

      {/* Milestones */}
      <div className="space-y-6">
        {milestones.map((milestone, index) => {
          const isCompleted = milestone.completed;
          const isCurrent = index === currentStage;
          const isLocked = index > currentStage;

          return (
            <div key={milestone.stage} className="relative flex gap-4">
              {/* Icon */}
              <div
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  isCompleted
                    ? 'bg-success border-success text-white'
                    : isCurrent
                    ? 'bg-white border-primary text-primary'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : isCurrent ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-6">
                <div className="flex items-start justify-between mb-1">
                  <h4
                    className={`font-semibold ${
                      isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {milestone.name}
                  </h4>
                  <span
                    className={`text-sm font-medium ${
                      isCompleted || isCurrent ? 'text-primary' : 'text-gray-500'
                    }`}
                  >
                    {milestone.allocation}%
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Stage {milestone.stage + 1} of {milestones.length}
                </p>
                {isCompleted && (
                  <span className="inline-block mt-2 badge-success">Completed</span>
                )}
                {isCurrent && (
                  <span className="inline-block mt-2 badge-warning">In Progress</span>
                )}
                {isLocked && (
                  <span className="inline-block mt-2 badge text-gray-500 bg-gray-100">
                    Locked
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
