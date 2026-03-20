import { SectionTitle } from "@/components/dashboard/ui";
import { Label } from "@/components/ui/label";
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";

export function AlignmentSection({ getS, updS }: { getS: (k: string, d: any) => any; updS: (k: string, v: any) => void }) {
  const options = [
    { value: "left", icon: AlignLeft, label: "Left" },
    { value: "center", icon: AlignCenter, label: "Center" },
    { value: "right", icon: AlignRight, label: "Right" },
  ] as const;

  return (
    <div className="space-y-4">
      <SectionTitle>Content Alignment</SectionTitle>
      <div className="space-y-2">
        <Label className="text-[11px] font-black uppercase text-gray-500">Profile Content Alignment</Label>
        <p className="text-[11px] text-gray-600">Controls where the profile box and all text is aligned on your page.</p>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {options.map(({ value, icon: Icon, label }) => (
            <button key={value} onClick={() => updS("contentAlign", value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${getS("contentAlign", "center") === value ? "border-orange-500 bg-orange-500/10" : "border-white/10 bg-black/30 hover:border-white/20"}`}>
              <Icon className={`w-5 h-5 ${getS("contentAlign", "center") === value ? "text-orange-500" : "text-gray-400"}`} />
              <span className={`text-xs font-black ${getS("contentAlign", "center") === value ? "text-orange-500" : "text-gray-400"}`}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
