import { SectionTitle, SettingRow, NumSlider } from "@/components/dashboard/ui";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AvatarSection({ getS, updS }: { getS: (k: string, d: any) => any; updS: (k: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <SectionTitle>Avatar</SectionTitle>
      <SettingRow label="Decoration" desc="Visual effect around the avatar">
        <Select value={getS("avatarDecoration", "none")} onValueChange={v => updS("avatarDecoration", v)}>
          <SelectTrigger className="w-36 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#0e0e0e] border-white/10">
            <SelectItem value="none" className="text-xs">None</SelectItem>
            <SelectItem value="ring-pulse" className="text-xs">Ring Pulse</SelectItem>
            <SelectItem value="ring-spin" className="text-xs">Ring Spin</SelectItem>
            <SelectItem value="neon" className="text-xs">Neon Glow</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <div className="space-y-1.5">
        <Label className="text-[11px] font-black uppercase text-gray-500">Corner Radius (0=square, 50=circle)</Label>
        <NumSlider value={getS("avatarRadius", 50)} onChange={v => updS("avatarRadius", v)} min={0} max={50} unit="%" />
      </div>
    </div>
  );
}
