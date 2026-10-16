import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
  NumberFieldScrubArea,
} from "@/components/reui/number-field";

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export function NumberBox({
  value,
  onChange,
  min = 1,
  max = 999,
  step = 1,
  disabled = false,
}: Props) {
  return (
    <div className="w-full max-w-48">
      <NumberField
        value={value}
        onValueChange={(next) => onChange(next ?? min)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
      >
        {/* <NumberFieldScrubArea label="Amount" /> */}
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
    </div>
  );
}
