import { useFormContext } from "react-hook-form";

interface LabeledTextFieldProps {
  label: string;
  disabled?: boolean;
  placeholder?: string;
  name?: string;
  value?: string;
  maxLength?: number;
  type?: string;
}

const LabelledTextField = ({ label, disabled, placeholder, maxLength, name, type }: LabeledTextFieldProps) => {
  const { register } = useFormContext();

  return (
    <div className="flex flex-col w-full text-white">
      <h1 className="text-[0.9rem] pb-1">{label}</h1>
      <input
        maxLength={maxLength}
        placeholder={placeholder}
        {...register(`${name}`)}
        disabled={disabled}
        type={type}
        className="border border-gray-600 bg-neutral-800 bg-transparent text-white w-full p-2"
      />
    </div>
  );
};

export default LabelledTextField;
