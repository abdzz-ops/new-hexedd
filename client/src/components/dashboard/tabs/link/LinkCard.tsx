import { ChevronUp, ChevronDown, ExternalLink, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiDiscord } from "react-icons/si";
import { getPlatform } from "@/components/dashboard/platforms";
import { resolveUrl } from "@/components/dashboard/helpers";
import { DiscordEmbedPreview } from "./DiscordEmbedPreview";

interface Props {
  link: any;
  idx: number;
  total: number;
  onMove: (link: any, dir: -1 | 1) => void;
  onToggle: (id: number, enabled: boolean) => void;
  onStyle: (id: number, style: string) => void;
  onDelete: (id: number) => void;
}

export function LinkCard({ link, idx, total, onMove, onToggle, onStyle, onDelete }: Props) {
  const lp = getPlatform(link.platform);

  return (
    <div className={`p-4 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl group hover:border-white/10 transition-colors ${link.platform === "discord-embed" ? "border-[#5865F2]/20 hover:border-[#5865F2]/30" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-0.5 shrink-0">
          <button onClick={() => onMove(link, -1)} disabled={idx === 0} className="text-gray-600 hover:text-white disabled:opacity-20 transition-colors"><ChevronUp className="w-3.5 h-3.5" /></button>
          <button onClick={() => onMove(link, 1)} disabled={idx === total - 1} className="text-gray-600 hover:text-white disabled:opacity-20 transition-colors"><ChevronDown className="w-3.5 h-3.5" /></button>
        </div>
        {link.platform === "discord-embed" ? (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#5865F2]/20">
            <SiDiscord className="w-5 h-5 text-[#5865F2]" />
          </div>
        ) : lp ? (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${lp.color}22` }}>
            <lp.icon style={{ color: lp.color }} className="w-5 h-5" />
          </div>
        ) : link.icon ? (
          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
            <img src={resolveUrl(link.icon)} alt="" className="w-6 h-6 object-contain" />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
            <ExternalLink className="w-4 h-4 text-gray-500" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm truncate">{link.title}</p>
          <p className="text-[11px] text-gray-500 truncate">{link.url}</p>
        </div>
        {link.platform !== "discord-embed" && (
          <Select value={link.style || "default"} onValueChange={style => onStyle(link.id, style)}>
            <SelectTrigger className="w-24 bg-black/40 border-white/10 text-[10px] h-7 font-bold"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#0e0e0e] border-white/10">
              <SelectItem value="default" className="text-xs">Default</SelectItem>
              <SelectItem value="card" className="text-xs">Card</SelectItem>
              <SelectItem value="icon" className="text-xs">Icon</SelectItem>
            </SelectContent>
          </Select>
        )}
        {link.platform === "discord-embed" && (
          <span className="text-[9px] font-black uppercase tracking-wider text-[#5865F2] bg-[#5865F2]/10 px-2 py-1 rounded-lg shrink-0">Embed</span>
        )}
        <Switch checked={link.enabled !== false} onCheckedChange={enabled => onToggle(link.id, enabled)} />
        <button onClick={() => { if (confirm("Delete this link?")) onDelete(link.id); }}
          className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {link.platform === "discord-embed" && link.url && <DiscordEmbedPreview url={link.url} />}
    </div>
  );
}
