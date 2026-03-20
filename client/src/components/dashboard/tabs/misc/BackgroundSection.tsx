import { SectionTitle, SettingRow, NumSlider } from "@/components/dashboard/ui";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function BackgroundSection({ getS, updS }: { getS: (k: string, d: any) => any; updS: (k: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <SectionTitle>Background</SectionTitle>
      <SettingRow label="Background Size">
        <Select value={getS("bgSize", "cover")} onValueChange={v => updS("bgSize", v)}>
          <SelectTrigger className="w-28 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#0e0e0e] border-white/10">
            <SelectItem value="cover" className="text-xs">Cover</SelectItem>
            <SelectItem value="contain" className="text-xs">Contain</SelectItem>
            <SelectItem value="100% 100%" className="text-xs">Stretch</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <div className="space-y-1.5">
        <Label className="text-[11px] font-black uppercase text-gray-500">Background Opacity</Label>
        <NumSlider value={getS("bgOpacity", 0.4)} onChange={v => updS("bgOpacity", v)} min={0} max={1} step={0.05} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px] font-black uppercase text-gray-500">Background Blur</Label>
        <NumSlider value={getS("bgBlur", 0)} onChange={v => updS("bgBlur", v)} min={0} max={30} unit="px" />
      </div>
    </div>
  );
}
