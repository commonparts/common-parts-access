import { FC, SVGProps, ReactNode } from "react";
import { Anchor, Globe, MapPin, Printer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

// ---- Wordmark as a React component ----
export const PartHarborWordmark: FC<SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      width={props.width || 220}
      height={props.height || 36}
      viewBox="0 0 880 144"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PartHarbor wordmark"
      {...props}
    >
      <g transform="translate(8,10)">
        <rect x="0" y="24" width="24" height="80" rx="6" className="fill-foreground" />
        <rect x="28" y="0" width="24" height="104" rx="6" className="fill-foreground" />
        <circle cx="40" cy="-2" r="6" className="fill-primary" />
        <rect x="58" y="62" width="16" height="16" rx="2" className="fill-primary" />
      </g>
      <text
        x="100"
        y="96"
        className="font-heading fill-foreground"
        fontSize="84"
        fontWeight="700"
        letterSpacing="0.5"
      >
        PartHarbor
      </text>
    </svg>
  );
};

// ---- Minimal mark-only SVG (for favicons, badges) ----
export const HarborMark: FC<SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      width={props.width || 40}
      height={props.height || 40}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PartHarbor mark"
      {...props}
    >
      <rect x="8" y="20" width="12" height="36" rx="4" className="fill-foreground" />
      <rect x="24" y="8" width="12" height="48" rx="4" className="fill-foreground" />
      <circle cx="30" cy="6" r="4" className="fill-primary" />
      <rect x="42" y="34" width="10" height="10" rx="2" className="fill-primary" />
    </svg>
  );
};

// ---- Feature Card ----
interface FeatureProps {
  icon: ReactNode;
  title: string;
  desc: string;
}

const Feature: FC<FeatureProps> = ({ icon, title, desc }) => {
  return (
    <li className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur shadow-lg shadow-foreground/5 transition-shadow hover:shadow-xl">
      <div className="flex items-start gap-3">
        <div className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/90 ring-1 ring-white/20 shadow-sm">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold font-body text-white">{title}</h3>
          <p className="mt-1 text-xs text-white/80 leading-relaxed">{desc}</p>
        </div>
      </div>
    </li>
  );
};

// ---- HERO SECTION ----
export const Hero: FC = () => {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-foreground" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(1200px 400px at 20% -10%, rgb(185 245 208 / 0.2), rgb(255 255 255 / 0)), radial-gradient(800px 300px at 80% 120%, rgb(255 138 61 / 0.18), rgb(255 255 255 / 0))",
          }}
        />
      </div>

      <div className="w-full p-6 sm:p-8">
        <div className="flex flex-col items-start max-w-4xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-extrabold leading-tight text-white">
            Don't throw it.
          </h1>

          <p className="mt-4 text-base sm:text-lg text-white/85 font-body whitespace-nowrap">
            Find 3D‑printable spare parts in the harbor. <strong>Together we fix what's broken.</strong>
          </p>
        </div>  

        <div className="mt-6 flex flex-col sm:flex-row gap-3 items-start">
          <Button asChild size="lg">
            <a href="/upload">
              Dock a model
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-white/25 text-white/90 bg-white/10 hover:bg-white/13 hover:text-white hover:border-white/40">
            <a href="/browse">
              Browse parts
            </a>
          </Button>
        </div>

        <ul className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-white/90">
          <Feature
            icon={<ShieldCheck className="w-5 h-5" />}
            title="Seaworthy fits"
            desc="Community‑verified models with material & tolerance notes."
          />
          <Feature
            icon={<Printer className="w-5 h-5" />}
            title="Print near you"
            desc="Send to Local Docks if you don’t have a printer."
          />
          <Feature
            icon={<MapPin className="w-5 h-5" />}
            title="Global‑local network"
            desc="Makers, FabLabs, and repair cafés ready to help."
          />
        </ul>

          <div className="mt-8 flex flex-wrap items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent text-foreground px-3 py-1.5 font-semibold shadow-lg shadow-accent/10">
              <Anchor className="w-4 h-4 stroke-[1.5]" /> Right‑to‑Repair friendly
            </span>
            <span className="text-white/70">•</span>
            <span className="inline-flex items-center gap-2 text-white/70">
              <Globe className="w-4 h-4 stroke-[1.5]" /> Community‑verified models
            </span>
            <span className="text-white/70">•</span>
            <span className="text-white/70">Local printing network</span>
          </div>
      </div>
    </section>
  );
};
