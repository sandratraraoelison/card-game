export function Feedback({
  text,
  error = false,
}: {
  text: string;
  error?: boolean;
}) {
  return (
    <div
      className={`feedback ${error ? "error" : "success"}`}
      role={error ? "alert" : "status"}
    >
      {error ? "ⓘ" : "✓"} {text}
    </div>
  );
}
