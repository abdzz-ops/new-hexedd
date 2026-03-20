import { SectionTitle, SettingRow, ColorPicker } from "@/components/dashboard/ui";

export function ColorsSection({ localProfile, upd, getS, updS }: { localProfile: any; upd: (k: string, v: any) => void; getS: (k: string, d: any) => any; updS: (k: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <SectionTitle>Colors</SectionTitle>
      <SettingRow label="Theme / Accent Color">
        <ColorPicker value={localProfile?.themeColor || "#F97316"} onChange={v => upd("themeColor", v)} label="Theme" />
      </SettingRow>
      <SettingRow label="Primary Text Color">
        <ColorPicker value={getS("primaryTextColor", "#ffffff")} onChange={v => updS("primaryTextColor", v)} label="Primary" />
      </SettingRow>
      <SettingRow label="Secondary Text Color">
        <ColorPicker value={getS("secondaryTextColor", "#9ca3af")} onChange={v => updS("secondaryTextColor", v)} label="Secondary" />
      </SettingRow>
      <SettingRow label="Box Border Color">
        <ColorPicker value={getS("boxBorderColor", "#ffffff")} onChange={v => updS("boxBorderColor", v)} label="Border" />
      </SettingRow>
    </div>
  );
}
