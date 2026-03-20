import { SettingRow, SectionTitle } from "@/components/dashboard/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function EffectsSection({ getS, updS }: { getS: (k: string, d: any) => any; updS: (k: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <SectionTitle>Visual Effects</SectionTitle>
      <SettingRow label="Profile Effect" desc="Color grading and film effects over your entire profile">
        <Select value={getS("profileEffect", "none")} onValueChange={v => updS("profileEffect", v)}>
          <SelectTrigger className="w-36 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#0e0e0e] border-white/10">
            {["none","retro","oldtv","night","vhs","glitch"].map(v => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow label="Background Particles" desc="Animated particles over the background">
        <Select value={getS("bgParticles", "none")} onValueChange={v => updS("bgParticles", v)}>
          <SelectTrigger className="w-36 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#0e0e0e] border-white/10">
            {["none","particles","snow","rain","fireflies","coins"].map(v => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow label="Page Overlay" desc="Decorative overlay over the background">
        <Select value={getS("pageOverlay", "none")} onValueChange={v => updS("pageOverlay", v)}>
          <SelectTrigger className="w-28 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#0e0e0e] border-white/10">
            {["none","dark","grid","dots","scanlines","vignette"].map(v => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </SettingRow>
    </div>
  );
}
