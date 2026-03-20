import { SectionTitle, SettingRow, NumSlider } from "@/components/dashboard/ui";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function BannerSection({ getS, updS }: { getS: (k: string, d: any) => any; updS: (k: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <SectionTitle>Banner Settings</SectionTitle>
      <div className="space-y-1.5">
        <Label className="text-[11px] font-black uppercase text-gray-500">Banner Opacity</Label>
        <NumSlider value={getS("bannerOpacity", 1)} onChange={v => updS("bannerOpacity", v)} min={0} max={1} step={0.05} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px] font-black uppercase text-gray-500">Banner Blur</Label>
        <NumSlider value={getS("bannerBlur", 0)} onChange={v => updS("bannerBlur", v)} min={0} max={20} unit="px" />
      </div>
      <SettingRow label="Banner Height" desc="Height of the banner area">
        <Select value={getS("bannerHeight", "160")} onValueChange={v => updS("bannerHeight", v)}>
          <SelectTrigger className="w-24 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#0e0e0e] border-white/10">
            <SelectItem value="100" className="text-xs">Small</SelectItem>
            <SelectItem value="160" className="text-xs">Medium</SelectItem>
            <SelectItem value="220" className="text-xs">Large</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
    </div>
  );
}
