import { AppStepper } from "@/components/common/app-stepper";

export const CheckoutSteps = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { title: "支付" },
    { title: "处理中" },
    { title: "完成" },
  ];

  // 进入最后一步即支付已完成，"完成"这一步也应显示为已完成
  return (
    <AppStepper
      steps={steps}
      currentStep={currentStep}
      completed={currentStep === steps.length}
    />
  );
};
