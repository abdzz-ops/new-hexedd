import { SectionTitle, SettingRow } from "@/components/dashboard/ui";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function UsernameSection({ getS, updS }: { getS: (k: string, d: any) => any; updS: (k: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <SectionTitle>Username Style</SectionTitle>
      <SettingRow label="Sparkle Effect" desc="Animated sparkles around the username">
        <Switch checked={getS("usernameSparkles", false)} onCheckedChange={v => updS("usernameSparkles", v)} />
      </SettingRow>
      {getS("usernameSparkles", false) && (
        <SettingRow label="Sparkle Color">
          <Select value={getS("sparkleColor", "theme")} onValueChange={v => updS("sparkleColor", v)}>
            <SelectTrigger className="w-36 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#0e0e0e] border-white/10">
              {["theme","rainbow","red","blue","green","purple","white","gold","glitch"].map(v =>
                <SelectItem key={v} value={v} className="text-xs capitalize">{v === "theme" ? "Theme Color" : v}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </SettingRow>
      )}
      <SettingRow label="Font">
        <Select value={getS("usernameFont", "inherit")} onValueChange={v => updS("usernameFont", v)}>
          <SelectTrigger className="w-36 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#0e0e0e] border-white/10">
            <SelectItem value="inherit" className="text-xs">Default</SelectItem>
            <SelectItem value="monospace" className="text-xs font-mono">Monospace</SelectItem>
            <SelectItem value="serif" className="text-xs" style={{ fontFamily: "serif" }}>Serif</SelectItem>
            <SelectItem value="'Courier New'" className="text-xs" style={{ fontFamily: "Courier New" }}>Courier New</SelectItem>
            <SelectItem value="Impact" className="text-xs" style={{ fontFamily: "Impact" }}>Impact</SelectItem>
            <SelectItem value="Georgia" className="text-xs" style={{ fontFamily: "Georgia" }}>Georgia</SelectItem>
            <SelectItem value="'Times New Roman'" className="text-xs" style={{ fontFamily: "Times New Roman" }}>Times New Roman</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow label="Profile Font" desc="Font applied to all text on your profile">
        <Select value={getS("profileFont", "inherit")} onValueChange={v => updS("profileFont", v)}>
          <SelectTrigger className="w-36 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#0e0e0e] border-white/10">
            <SelectItem value="inherit" className="text-xs">Default</SelectItem>
            <SelectItem value="monospace" className="text-xs font-mono">Monospace</SelectItem>
            <SelectItem value="serif" className="text-xs" style={{ fontFamily: "serif" }}>Serif</SelectItem>
            <SelectItem value="Georgia" className="text-xs" style={{ fontFamily: "Georgia" }}>Georgia</SelectItem>
            <SelectItem value="'Courier New'" className="text-xs" style={{ fontFamily: "Courier New" }}>Courier New</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
    </div>
  );
}
