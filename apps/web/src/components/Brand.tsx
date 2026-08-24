import { Droplets } from "lucide-react";

export function Brand() {
  return (
    <div className="brand" aria-label="HydroCycle home">
      <span className="brand__mark" aria-hidden="true">
        <Droplets size={23} strokeWidth={2.1} />
      </span>
      <span>HydroCycle</span>
    </div>
  );
}
