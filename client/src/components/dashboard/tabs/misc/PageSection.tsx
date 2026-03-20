import { SectionTitle, SettingRow, NumSlider } from "@/components/dashboard/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function PageSection({ getS, updS }: { getS: (k: string, d: any) => any; updS: (k: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <SectionTitle>Page Settings</SectionTitle>
      <div className="space-y-1.5">
        <Label className="text-[11px] font-black uppercase text-gray-500">Favicon URL</Label>
        <Input value={getS("faviconUrl", "")} onChange={e => updS("faviconUrl", e.target.value)} placeholder="https://..." className="bg-black/60 border-white/5 h-9 text-sm" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px] font-black uppercase text-gray-500">Page Title</Label>
        <Input value={getS("pageTitle", "")} onChange={e => updS("pageTitle", e.target.value)} placeholder="Custom browser tab title..." className="bg-black/60 border-white/5 h-9 text-sm" />
      </div>
      <SettingRow label="Title Animation" desc="How the page title animates in the browser tab">
        <Select value={getS("pageTitleAnim", "none")} onValueChange={v => updS("pageTitleAnim", v)}>
          <SelectTrigger className="w-28 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#0e0e0e] border-white/10">
            <SelectItem value="none" className="text-xs">None</SelectItem>
            <SelectItem value="scroll" className="text-xs">Scroll</SelectItem>
            <SelectItem value="blink" className="text-xs">Blink</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      {getS("pageTitleAnim", "none") !== "none" && (
        <div className="space-y-1.5">
          <Label className="text-[11px] font-black uppercase text-gray-500">Animation Speed</Label>
          <NumSlider value={getS("pageTitleAnimSpeed", 3)} onChange={v => updS("pageTitleAnimSpeed", v)} min={1} max={10} />
        </div>
      )}
      <SettingRow label="Enter Animation">
        <Select value={getS("pageEnterAnim", "fade")} onValueChange={v => updS("pageEnterAnim", v)}>
          <SelectTrigger className="w-28 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#0e0e0e] border-white/10">
            {["fade","slide-up","scale","blur"].map(v => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </SettingRow>
      <div className="space-y-1.5">
        <Label className="text-[11px] font-black uppercase text-gray-500">Enter Animation Speed</Label>
        <NumSlider value={getS("pageEnterSpeed", 0.4)} onChange={v => updS("pageEnterSpeed", v)} min={0.1} max={2} step={0.1} unit="s" />
      </div>
    </div>
  );
}
