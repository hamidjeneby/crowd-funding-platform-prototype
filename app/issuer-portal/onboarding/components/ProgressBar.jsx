import { Check } from "lucide-react";

export default function ProgressBar({ currentStep, steps, completedSteps, maxReachedStep, onStepClick }) {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center relative">
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 z-0"></div>
        <div 
          className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-[#064e3b] z-0 transition-all duration-300 ease-in-out" 
          style={{ width: `${(Math.max(0, currentStep - 1) / (steps.length - 1)) * 100}%` }}
        ></div>
        
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = completedSteps.includes(stepNumber);
          const isCurrent = currentStep === stepNumber;
          const isClickable = onStepClick && (isCompleted || isCurrent || (maxReachedStep && stepNumber <= maxReachedStep));
          
          return (
            <div 
              key={step.id} 
              className={`relative z-10 flex flex-col items-center group ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
              onClick={() => isClickable && onStepClick(stepNumber)}
            >
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors duration-200
                  ${isCompleted ? 'bg-[#064e3b] border-[#064e3b] text-white' : 
                    isCurrent ? 'bg-white border-[#064e3b] text-[#064e3b]' : 
                    isClickable ? 'bg-white border-emerald-600 text-emerald-800 group-hover:bg-emerald-50' :
                    'bg-white border-gray-300 text-gray-400'}`}
              >
                {isCompleted ? <Check size={20} /> : stepNumber}
              </div>
              <div className="absolute top-12 whitespace-nowrap text-xs font-medium text-center">
                <span className={`${isCurrent || isCompleted ? 'text-[#064e3b]' : isClickable ? 'text-emerald-800 font-semibold' : 'text-gray-400'}`}>
                  {step.title}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="h-8"></div> {/* Spacer for the absolute positioned text */}
    </div>
  );
}
