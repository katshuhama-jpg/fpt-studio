import { EXTERNAL_APP_META, type ExternalApp } from "./triggerStore";

/** Real brand logo badge for an External-trigger app — same visual convention as
 * ChannelLogo.tsx (rounded square, white background, bordered). */
export default function AppLogo({ app, size = 20 }: { app: ExternalApp; size?: number }) {
  const meta = EXTERNAL_APP_META[app];
  return (
    <span
      className="inline-flex items-center justify-center rounded-md bg-white border border-border shrink-0 overflow-hidden"
      style={{ width: size, height: size }}
    >
      <img src={meta.logoUrl} alt={meta.label} className="w-full h-full object-contain p-0.5" />
    </span>
  );
}
