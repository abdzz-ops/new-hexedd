import { SectionTitle, SettingRow, NumSlider, ColorPicker } from "@/components/dashboard/ui";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function BoxSection({ getS, updS }: { getS: (k: string, d: any) => any; updS: (k: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <SectionTitle>Profile Box</SectionTitle>
      <SettingRow label="3D Tilt on Hover" desc="Box tilts when you hover with the mouse">
        <Switch checked={getS("boxTilt", false)} onCheckedChange={v => updS("boxTilt", v)} />
      </SettingRow>
      {getS("boxTilt", false) && <>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-black uppercase text-gray-500">Tilt Intensity</Label>
          <NumSlider value={getS("boxTiltIntensity", 12)} onChange={v => updS("boxTiltIntensity", v)} min={1} max={30} unit="°" />
        </div>
        <SettingRow label="Auto Tilt" desc="Tilt animates automatically on a timer">
          <Switch checked={getS("autoTilt", false)} onCheckedChange={v => updS("autoTilt", v)} />
        </SettingRow>
        {getS("autoTilt", false) && (
          <div className="space-y-1.5">
            <Label className="text-[11px] font-black uppercase text-gray-500">Auto Tilt Interval</Label>
            <NumSlider value={getS("autoTiltInterval", 4)} onChange={v => updS("autoTiltInterval", v)} min={1} max={15} unit="s" />
          </div>
        )}
      </>}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-black uppercase text-gray-500">Box Width</Label>
        <NumSlider value={getS("boxWidth", 520)} onChange={v => updS("boxWidth", v)} min={320} max={800} unit="px" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px] font-black uppercase text-gray-500">Inner Spacing</Label>
        <NumSlider value={getS("boxPadding", 28)} onChange={v => updS("boxPadding", v)} min={8} max={60} unit="px" />
      </div>
      <SettingRow label="Box Color">
        <ColorPicker value={getS("boxColor", "#000000")} onChange={v => updS("boxColor", v)} label="Box" />
      </SettingRow>
      <div className="space-y-1.5">
        <Label className="text-[11px] font-black uppercase text-gray-500">Box Opacity</Label>
        <NumSlider value={getS("boxOpacity", 0.45)} onChange={v => updS("boxOpacity", v)} min={0} max={1} step={0.05} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px] font-black uppercase text-gray-500">Corner Radius</Label>
        <NumSlider value={getS("boxRadius", 24)} onChange={v => updS("boxRadius", v)} min={0} max={60} unit="px" />
      </div>
    </div>
  );
}
