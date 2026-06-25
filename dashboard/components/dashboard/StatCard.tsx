import clsx from "clsx";

interface StatCardProps {
  label: string;
  value: number;
  color?: "indigo" | "emerald" | "violet" | "amber";
}

const colorMap = {
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  violet: "bg-violet-50 text-violet-700 border-violet-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
};

const valueColorMap = {
  indigo: "text-indigo-600",
  emerald: "text-emerald-600",
  violet: "text-violet-600",
  amber: "text-amber-600",
};

export default function StatCard({
  label,
  value,
  color = "indigo",
}: StatCardProps) {
  return (
    <div
      className={clsx(
        "rounded-xl border p-4 shadow-sm",
        colorMap[color]
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className={clsx("text-3xl font-bold mt-1", valueColorMap[color])}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
