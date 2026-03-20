import { SectionTitle, SettingRow, NumSlider } from "@/components/dashboard/ui";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function RevealSection({ getS, updS }: { getS: (k: string, d: any) => any; updS: (k: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <SectionTitle>Reveal Screen</SectionTitle>
      <p className="text-[11px] text-gray-500">Configure the reveal screen in the Profile tab under Reveal Screen settings.</p>
      <SettingRow label="Background Blur" desc="Blur behind the reveal overlay">
        <NumSlider value={getS("revealBlur", 8)} onChange={v => updS("revealBlur", v)} min={0} max={30} unit="px" />
      </SettingRow>
      <SettingRow label="Auto Reveal" desc="Automatically reveal profile after a delay">
        <Switch checked={getS("autoReveal", false)} onCheckedChange={v => updS("autoReveal", v)} />
      </SettingRow>
      {getS("autoReveal", false) && (
        <div className="space-y-1.5">
          <Label className="text-[11px] font-black uppercase text-gray-500">Auto Reveal Delay</Label>
          <NumSlider value={getS("autoRevealDelay", 3)} onChange={v => updS("autoRevealDelay", v)} min={1} max={30} unit="s" />
        </div>
      )}
    </div>
  );
}
