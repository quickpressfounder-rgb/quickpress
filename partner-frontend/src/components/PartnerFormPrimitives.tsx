import {
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import type { InputHTMLAttributes, ReactNode } from "react";

/* ---------------- Step progress ---------------- */

export function StepProgress({
  steps,
  current,
  onStepClick,
}: {
  steps: readonly string[];
  current: number;
  onStepClick?: (index: number) => void;
}) {
  const pct = ((current + 1) / steps.length) * 100;

  return (
    <div className="sticky top-0 z-20 rounded-3xl border border-zinc-200/90 bg-white/95 px-5 py-3.5 shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between">
        <p className="text-[0.68rem] font-bold uppercase tracking-widest text-zinc-500">
          Step {current + 1} of {steps.length}
        </p>
        <p className="text-[0.75rem] font-black tracking-tight text-primary">
          {Math.round(pct)}% Complete
        </p>
      </div>
      <p className="mt-0.5 text-sm font-black tracking-tight text-zinc-900">{steps[current]}</p>

      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out shadow-xs"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
        {steps.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => onStepClick?.(index)}
            aria-label={`Go to ${label}`}
            className={`h-1.5 flex-1 min-w-[20px] rounded-full transition-all duration-300 cursor-pointer ${
              index < current
                ? "bg-primary/60 hover:opacity-80"
                : index === current
                  ? "bg-primary"
                  : "bg-zinc-200 hover:bg-zinc-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------------- Inputs ---------------- */

export function FormField({
  id,
  label,
  icon: Icon,
  error,
  hint,
  prefix,
  rightAddon,
  ...rest
}: {
  id: string;
  label: string;
  icon?: LucideIcon;
  error?: string | undefined;
  hint?: string;
  prefix?: string;
  rightAddon?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-black uppercase tracking-wider text-zinc-700 mb-1.5"
      >
        {label}
      </label>
      <div
        className={`flex items-center gap-2.5 rounded-2xl border bg-white px-4 py-3 shadow-xs transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 ${
          error ? "border-red-500 bg-red-50/20" : "border-zinc-200"
        }`}
      >
        {Icon ? <Icon className="size-4 shrink-0 text-zinc-400" /> : null}
        {prefix ? (
          <>
            <span className="text-sm font-bold text-zinc-900">{prefix}</span>
            <span className="h-5 w-px bg-zinc-200" />
          </>
        ) : null}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          {...rest}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold tracking-tight text-zinc-900 outline-none placeholder:text-zinc-400 disabled:opacity-75"
        />
        {rightAddon}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs font-medium text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextAreaField({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  action,
}: {
  id: string;
  label: string;
  value: string;
  onChange: ((next: string) => void) | ((e: React.ChangeEvent<HTMLTextAreaElement>) => void);
  placeholder?: string;
  error?: string | undefined;
  action?: ReactNode;
}) {
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    (onChange as (val: any) => void)(event.target.value);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor={id}
          className="block text-xs font-black uppercase tracking-wider text-zinc-700"
        >
          {label}
        </label>
        {action}
      </div>
      <div
        className={`rounded-2xl border bg-white px-4 py-3 shadow-xs transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 ${
          error ? "border-red-500 bg-red-50/20" : "border-zinc-200"
        }`}
      >
        <textarea
          id={id}
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={handleChange}
          className="w-full resize-none bg-transparent text-sm font-semibold tracking-tight text-zinc-900 outline-none placeholder:text-zinc-400"
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>
      ) : null}
    </div>
  );
}

export function SelectField({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  error,
  icon: Icon,
}: {
  id: string;
  label: string;
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  error?: string | undefined;
  icon?: LucideIcon;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-black uppercase tracking-wider text-zinc-700 mb-1.5"
      >
        {label}
      </label>
      <div
        className={`flex items-center gap-2.5 rounded-2xl border bg-white px-4 py-3 shadow-xs transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 ${
          error ? "border-red-500 bg-red-50/20" : "border-zinc-200"
        }`}
      >
        {Icon ? <Icon className="size-4 shrink-0 text-zinc-400" /> : null}
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 appearance-none bg-transparent text-sm font-semibold tracking-tight text-zinc-900 outline-none cursor-pointer"
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="size-4 shrink-0 text-zinc-400 pointer-events-none" />
      </div>
      {error ? (
        <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>
      ) : null}
    </div>
  );
}

export function SliderField({
  id,
  label,
  value,
  onChange,
  min = 1,
  max = 25,
  unit = "km",
}: {
  id: string;
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-xs font-black uppercase tracking-wider text-zinc-700"
        >
          {label}
        </label>
        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-700 border border-emerald-200">
          {value} {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-primary"
      />
      <div className="flex justify-between text-[10px] font-bold text-zinc-400 px-1">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}

/* ---------------- Choice controls ---------------- */

export function ChoiceChip({
  label,
  selected,
  onClick,
  icon: Icon,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: LucideIcon;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold tracking-tight transition-all duration-200 active:scale-[0.96] cursor-pointer ${
        selected
          ? "border-amber-400 bg-amber-100/80 text-amber-950 shadow-xs"
          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
      }`}
    >
      {Icon ? <Icon className="size-3.5" strokeWidth={2.4} /> : null}
      <span>{label}</span>
      {selected ? <Check className="size-3.5 text-emerald-600 stroke-[3]" /> : null}
    </button>
  );
}

export function ServiceCard({
  title,
  label,
  description,
  price,
  unit,
  selected,
  onClick,
  onToggle,
  icon: Icon,
}: {
  title?: string;
  label?: string;
  description?: string;
  price?: number;
  unit?: string;
  selected: boolean;
  onClick?: () => void;
  onToggle?: () => void;
  icon?: LucideIcon;
}) {
  const effectiveTitle = title || label || "Service";
  const handleClick = onToggle || onClick || (() => {});

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={handleClick}
      className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left shadow-xs transition-all duration-200 active:scale-[0.98] cursor-pointer ${
        selected
          ? "border-amber-400 bg-amber-50/80 shadow-xs"
          : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
      }`}
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-2xl transition-colors ${
          selected ? "bg-amber-200/80 text-amber-900" : "bg-zinc-100 text-zinc-600"
        }`}
      >
        {Icon ? <Icon className="size-5" strokeWidth={2.2} /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-zinc-900">
          {effectiveTitle}
        </span>
        <span className="block text-xs font-semibold text-emerald-700">
          {price !== undefined ? `₹${price} / ${unit || "item"}` : description || ""}
        </span>
      </div>
      <span
        className={`flex size-6 shrink-0 items-center justify-center rounded-full border transition-all ${
          selected
            ? "border-emerald-500 bg-emerald-500 text-white shadow-xs"
            : "border-zinc-300 bg-white"
        }`}
      >
        {selected ? <Check className="size-3.5 stroke-[3]" /> : null}
      </span>
    </button>
  );
}

/* ---------------- Uploads with real Image preview ---------------- */

export function UploadTile({
  label,
  hint,
  value,
  onChange,
  onPick,
  onClear,
  icon: Icon = ImageIcon,
  aspect = "square",
}: {
  label: string;
  hint?: string;
  value?: string;
  onChange?: (val: string) => void;
  onPick?: (val: string) => void;
  onClear?: () => void;
  icon?: LucideIcon;
  aspect?: "square" | "wide";
}) {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (onChange) onChange(dataUrl);
      else if (onPick) onPick(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    if (onClear) onClear();
    else if (onChange) onChange("");
    else if (onPick) onPick("");
  };

  const hasImage = Boolean(value && (value.startsWith("data:") || value.startsWith("http")));

  return (
    <div>
      <label
        className={`relative flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed bg-white p-3 text-center shadow-xs transition-all hover:border-amber-400 active:scale-[0.98] ${
          value ? "border-emerald-500 bg-emerald-50/20" : "border-zinc-200"
        } ${aspect === "wide" ? "h-32" : "h-36"}`}
      >
        {hasImage ? (
          <img
            src={value}
            alt={label}
            className="absolute inset-0 size-full object-cover rounded-2xl"
          />
        ) : (
          <>
            <span
              className={`flex size-10 items-center justify-center rounded-2xl transition-colors ${
                value ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
              }`}
            >
              {value ? <CheckCircle2 className="size-5" /> : <Icon className="size-5" />}
            </span>
            <span className="text-xs font-bold text-zinc-900">{label}</span>
            <span className="line-clamp-1 text-[11px] font-medium text-zinc-500">
              {value ? "Uploaded" : hint || "Tap to upload photo"}
            </span>
          </>
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </label>
      {value ? (
        <button
          type="button"
          onClick={handleClear}
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer"
        >
          <Trash2 className="size-3" /> Remove Photo
        </button>
      ) : null}
    </div>
  );
}

export function GalleryUploader({
  items,
  images,
  onChange,
  onAdd,
  onRemove,
  max = 6,
}: {
  items?: string[];
  images?: string[];
  onChange?: (items: string[]) => void;
  onAdd?: (item: string) => void;
  onRemove?: (index: number) => void;
  max?: number;
}) {
  const currentImages = items || images || [];

  const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (onChange) {
        onChange([...currentImages, dataUrl]);
      } else if (onAdd) {
        onAdd(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = (index: number) => {
    if (onChange) {
      onChange(currentImages.filter((_, i) => i !== index));
    } else if (onRemove) {
      onRemove(index);
    }
  };

  return (
    <div>
      <label className="block text-xs font-black uppercase tracking-wider text-zinc-700 mb-2">
        Store Gallery & Equipment Photos ({currentImages.length}/{max})
      </label>
      <div className="grid grid-cols-3 gap-3">
        {currentImages.map((src, index) => {
          const isUrl = src.startsWith("data:") || src.startsWith("http");
          return (
            <div
              key={`${index}`}
              className="relative flex h-24 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-100 overflow-hidden shadow-xs"
            >
              {isUrl ? (
                <img
                  src={src}
                  alt={`Store photo ${index + 1}`}
                  className="size-full object-cover"
                />
              ) : (
                <span className="p-2 text-center text-xs font-semibold text-zinc-600 line-clamp-2">
                  Photo {index + 1}
                </span>
              )}
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => handleRemove(index)}
                className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 active:scale-90 cursor-pointer"
              >
                <X className="size-3.5 stroke-[3]" />
              </button>
            </div>
          );
        })}

        {currentImages.length < max ? (
          <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-zinc-300 bg-white text-center transition-all hover:border-primary hover:bg-primary/5 active:scale-[0.97]">
            <Plus className="size-5 text-primary" />
            <span className="text-xs font-bold text-zinc-700">Add Photo</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAddFile}
            />
          </label>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------- Layout helpers ---------------- */

export function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900">
            {title}
          </h3>
          {description ? (
            <p className="mt-0.5 text-xs font-medium text-zinc-500">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="space-y-4 pt-1">
        {children}
      </div>
    </section>
  );
}

export function ReviewRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-zinc-50 last:border-0">
      <span className="text-xs font-semibold text-zinc-500">{label}</span>
      <span className="max-w-[60%] text-right text-xs font-bold text-zinc-900 break-words">
        {value || "—"}
      </span>
    </div>
  );
}
