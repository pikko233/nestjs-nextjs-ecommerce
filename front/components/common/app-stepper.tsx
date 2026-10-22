"use client";

import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/components/reui/stepper";
import { CheckIcon, LoaderCircleIcon } from "lucide-react";

interface Props {
  currentStep: number;
  steps: Array<{ title: string }>;
  // 整个流程已结束：当前步骤也显示为完成态，而不是进行中
  completed?: boolean;
}

export function AppStepper({ steps, currentStep, completed = false }: Props) {
  return (
    <Stepper
      className="w-full max-w-md space-y-8"
      value={currentStep}
      indicators={{
        completed: <CheckIcon className="size-3.5" />,
        loading: <LoaderCircleIcon className="size-3.5 animate-spin" />,
      }}
    >
      <StepperNav>
        {steps.map((step, index) => (
          <StepperItem
            key={index}
            step={index + 1}
            completed={completed}
            className="relative flex-1 items-start"
          >
            <StepperTrigger className="flex flex-col gap-2.5">
              <StepperIndicator className="data-[state=active]:text-primary-foreground data-[state=active]:bg-primary data-[state=active]:border-primary data-[state=inactive]:border-muted size-5 border-2 data-[state=completed]:border-green-500 data-[state=completed]:bg-green-500 data-[state=completed]:text-white">
                {index + 1}
              </StepperIndicator>
              <StepperTitle>{step.title}</StepperTitle>
            </StepperTrigger>
            {steps.length > index + 1 && (
              <StepperSeparator className="group-data-[state=completed]/step:bg-green-500 absolute inset-x-0 top-3 left-[calc(50%+0.875rem)] m-0 group-data-[orientation=horizontal]/stepper-nav:w-[calc(100%-2rem+0.225rem)] group-data-[orientation=horizontal]/stepper-nav:flex-none" />
            )}
          </StepperItem>
        ))}
      </StepperNav>
      <StepperPanel className="text-sm">
        {steps.map((step, index) => (
          <StepperContent
            key={index}
            value={index + 1}
            className="flex items-center justify-center"
          >
            {/* Step {step.title} content */}
          </StepperContent>
        ))}
      </StepperPanel>
    </Stepper>
  );
}
