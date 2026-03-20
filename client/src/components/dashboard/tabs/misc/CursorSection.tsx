import { SectionTitle, SettingRow, ColorPicker } from "@/components/dashboard/ui";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CursorSection({ getS, updS, isPremium }: { getS: (k: string, d: any) => any; updS: (k: string, v: any) => void; isPremium?: boolean }) {
  return (
    <div className="space-y-4">
      <SectionTitle>Cursor</SectionTitle>

      {!isPremium && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-purple-500/30 bg-purple-500/5">
          <span className="text-lg">💎</span>
          <div>
            <p className="text-sm font-black text-purple-400">Premium Feature</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Custom cursors are exclusive to Premium users.</p>
          </div>
          <a href="/shop" className="ml-auto shrink-0 px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[10px] font-black uppercase tracking-widest hover:bg-purple-500/30 transition-colors">
            Upgrade
          </a>
        </div>
      )}

      <div className={!isPremium ? "opacity-40 pointer-events-none select-none" : ""}>
        <div className="space-y-4">
          <SettingRow label="Cursor Style">
            <Select value={getS("cursor", "default")} onValueChange={v => updS("cursor", v)}>
              <SelectTrigger className="w-32 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0e0e0e] border-white/10">
                {["default","none","crosshair","pointer","cell","zoom-in"].map(v =>
                  <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label="Cursor Trail" desc="Glowing trail that follows the cursor">
            <Switch checked={getS("cursorTrail", false)} onCheckedChange={v => updS("cursorTrail", v)} />
          </SettingRow>
          {getS("cursorTrail", false) && (
            <SettingRow label="Trail Color">
              <ColorPicker value={getS("cursorTrailColor", "#F97316")} onChange={v => updS("cursorTrailColor", v)} label="Trail" />
            </SettingRow>
          )}
        </div>
      </div>
    </div>
  );
}
