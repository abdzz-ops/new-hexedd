import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Loader2, Upload, Music, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function TrackTab({ userTracks }: { userTracks: any[] }) {
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUpload();
  const [adding, setAdding] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");
  const [trackUrl, setTrackUrl] = useState("");
  const [artistProfile, setArtistProfile] = useState("");

  const addTrackMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/tracks", { title: trackTitle, url: trackUrl, artistProfile }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      setTrackTitle(""); setTrackUrl(""); setArtistProfile(""); setAdding(false);
      toast({ title: "Track added" });
    },
  });

  const deleteTrackMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tracks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tracks"] }),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) setTrackUrl(result.publicUrl || `${window.location.origin}${result.objectPath}`);
    e.target.value = "";
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black">Track</h1>
          <p className="text-gray-500 text-sm mt-1">Manage music tracks for your profile player</p>
        </div>
        <button onClick={() => setAdding(a => !a)}
          className="px-5 h-9 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Track
        </button>
      </div>
      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="border border-orange-500/20 rounded-2xl p-4 space-y-3 bg-orange-500/5">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-gray-500">Track Title</Label>
              <Input value={trackTitle} onChange={e => setTrackTitle(e.target.value)} placeholder="Song name..." className="bg-black/60 border-white/5 h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-gray-500">Artist / Profile <span className="text-gray-600 normal-case font-normal">(optional)</span></Label>
              <Input value={artistProfile} onChange={e => setArtistProfile(e.target.value)} placeholder="Artist name or profile link..." className="bg-black/60 border-white/5 h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-gray-500">Audio URL or Upload</Label>
              <div className="flex gap-2">
                <Input value={trackUrl} onChange={e => setTrackUrl(e.target.value)} placeholder="https://... or upload" className="bg-black/60 border-white/5 h-9 text-sm flex-1" />
                <label className={`flex items-center justify-center w-9 h-9 rounded-xl border border-white/10 bg-white/5 cursor-pointer ${isUploading ? "opacity-50" : "hover:border-orange-500/40"}`}>
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" /> : <Upload className="w-3.5 h-3.5 text-gray-400" />}
                  <input type="file" accept="audio/*,video/*" className="hidden" onChange={handleUpload} />
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => addTrackMutation.mutate()} disabled={!trackTitle || !trackUrl || addTrackMutation.isPending}
                className="flex-1 h-9 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                {addTrackMutation.isPending ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : "Add Track"}
              </button>
              <button onClick={() => setAdding(false)} className="px-4 h-9 text-gray-500 hover:text-white font-black rounded-xl border border-white/10 text-sm transition-all">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl overflow-hidden">
        {(userTracks || []).length === 0 && !adding ? (
          <div className="py-12 text-center">
            <Music className="w-8 h-8 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-600 font-bold">No tracks yet</p>
            <p className="text-[11px] text-gray-700 mt-1">Add your first track above</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {(userTracks || []).map((t: any, i: number) => (
              <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 group hover:bg-white/[0.02] transition-colors">
                <span className="text-[10px] font-black text-gray-700 w-4 text-center">{i + 1}</span>
                <Music className="w-4 h-4 text-orange-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{t.title}</p>
                  {t.artistProfile && <p className="text-[11px] text-gray-500 truncate mt-0.5">{t.artistProfile}</p>}
                </div>
                <button onClick={() => deleteTrackMutation.mutate(t.id)} className="text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
