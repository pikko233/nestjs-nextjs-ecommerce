"use client";

import { CreditCardIcon, LandmarkIcon, WalletIcon } from "lucide-react";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// stripeMethods：该选项在 Stripe PaymentElement 中优先展示的支付方式
export const paymentMethods = [
  {
    value: "card",
    title: "信用卡 / 借记卡",
    description: "Visa, Mastercard, American Express",
    icon: CreditCardIcon,
    stripeMethods: ["card"],
  },
  {
    value: "wallet",
    title: "电子钱包",
    description: "支付宝、微信支付、Apple Pay",
    icon: WalletIcon,
    stripeMethods: ["alipay", "wechat_pay"],
  },
  // {
  //   value: "bank",
  //   title: "Bank Transfer",
  //   description: "Pay directly from your bank account",
  //   icon: LandmarkIcon,
  // },
];

type PaymentMethodsProps = {
  selectedMethod: string;
  onSelect: (method: string) => void;
  disabled?: boolean;
};

export const PaymentMethods = ({
  selectedMethod,
  onSelect,
  disabled,
}: PaymentMethodsProps) => {
  return (
    <FieldSet className="w-full max-w-xl">
      <FieldLegend>支付方式</FieldLegend>
      <FieldDescription>请选择您的支付方式</FieldDescription>
      <RadioGroup
        value={selectedMethod}
        onValueChange={onSelect}
        disabled={disabled}
      >
        {paymentMethods.map(({ value, title, description, icon: Icon }) => (
          <FieldLabel key={value} htmlFor={`payment-${value}`}>
            <Field orientation="horizontal">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon className="size-5" />
              </div>
              <FieldContent>
                <FieldTitle>{title}</FieldTitle>
                <FieldDescription>{description}</FieldDescription>
              </FieldContent>
              <RadioGroupItem value={value} id={`payment-${value}`} />
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>
    </FieldSet>
  );
};
