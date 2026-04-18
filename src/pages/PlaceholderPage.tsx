import { Construction, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-10 animate-fade-up">
      <div className="w-16 h-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-5 border border-primary/15">
        <Construction size={26} />
      </div>
      <h2 className="font-display text-2xl font-semibold mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        This screen is part of the v2 expansion (15+ screens from HDSD v6.3). Design system,
        navigation and tokens are ready — coming in the next batch.
      </p>
      <Link to="/" className="btn-secondary">
        Back to Home <ArrowRight size={14} />
      </Link>
    </div>
  );
}
