interface FormErrorProps {
  message?: string;
}

/** Inline banner for a failed submit; renders nothing without a message. */
export function FormError({ message }: FormErrorProps) {
  if (!message) return null;
  return (
    <div role="alert" className="bg-error-subtle text-error p-3 rounded-md text-sm">
      {message}
    </div>
  );
}
