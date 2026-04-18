import { Construction } from "lucide-react";

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-10 animate-fade-up">
      <div className="w-20 h-20 rounded-2xl bg-gradient-coral flex items-center justify-center mb-5 shadow-elev">
        <Construction size={32} className="text-accent-foreground" />
      </div>
      <h2 className="font-display text-2xl font-semibold mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        Outside the v1 scope (~6 core screens). The design system, navigation and tokens are ready —
        ping us to design this screen next.
      </p>
    </div>
  );
}
