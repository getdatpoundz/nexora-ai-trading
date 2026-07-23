import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LifeBuoy, Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type Msg = {
  id: string;
  user_id: string;
  sender_role: "user" | "admin";
  body: string;
  created_at: string;
};

type ProfileLite = { id: string; email: string | null; first_name: string | null; last_name: string | null };

export function AdminSupportPanel() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .order("created_at", { ascending: true });
      if (!mounted || !data) return;
      setMessages(data as Msg[]);
      const ids = Array.from(new Set(data.map((m) => m.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, email, first_name, last_name")
          .in("id", ids);
        if (profs) {
          const map: Record<string, ProfileLite> = {};
          for (const p of profs) map[p.id] = p as ProfileLite;
          setProfiles(map);
        }
      }
    })();

    const ch = supabase
      .channel("admin-support")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages" },
        (payload) => setMessages((m) => [...m, payload.new as Msg]),
      )
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  const threads = useMemo(() => {
    const byUser = new Map<string, Msg[]>();
    for (const m of messages) {
      const arr = byUser.get(m.user_id) ?? [];
      arr.push(m);
      byUser.set(m.user_id, arr);
    }
    return Array.from(byUser.entries())
      .map(([uid, msgs]) => ({
        userId: uid,
        latest: msgs[msgs.length - 1],
        unread: msgs.filter((m) => m.sender_role === "user").length,
        msgs,
      }))
      .sort((a, b) => b.latest.created_at.localeCompare(a.latest.created_at));
  }, [messages]);

  useEffect(() => {
    if (!activeUserId && threads[0]) setActiveUserId(threads[0].userId);
  }, [threads, activeUserId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [activeUserId, messages]);

  const activeMsgs = activeUserId ? messages.filter((m) => m.user_id === activeUserId) : [];

  async function sendReply() {
    if (!activeUserId || !user || !reply.trim() || sending) return;
    setSending(true);
    const body = reply.trim();
    setReply("");
    const { error } = await supabase
      .from("support_messages")
      .insert({ user_id: activeUserId, sender_role: "admin", body });
    if (error) {
      toast.error("Kunde inte skicka svar");
      setReply(body);
    }
    setSending(false);
  }

  const nameFor = (uid: string) => {
    const p = profiles[uid];
    if (!p) return uid.slice(0, 8);
    return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email || uid.slice(0, 8);
  };

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <LifeBuoy className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Live-support</h2>
      </div>
      <div className="grid gap-0 md:grid-cols-[280px_1fr]">
        <div className="max-h-[480px] overflow-y-auto border-b border-border md:border-b-0 md:border-r">
          {threads.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">Inga inkomna meddelanden.</p>
          )}
          {threads.map((t) => (
            <button
              key={t.userId}
              onClick={() => setActiveUserId(t.userId)}
              className={`block w-full border-b border-border p-3 text-left text-sm transition hover:bg-muted ${activeUserId === t.userId ? "bg-muted" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{nameFor(t.userId)}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {new Date(t.latest.created_at).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {t.latest.sender_role === "admin" ? "Du: " : ""}{t.latest.body}
              </p>
            </button>
          ))}
        </div>
        <div className="flex flex-col">
          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4" style={{ maxHeight: 480 }}>
            {!activeUserId && <p className="text-sm text-muted-foreground">Välj ett ärende.</p>}
            {activeMsgs.map((m) => (
              <div key={m.id} className={`flex ${m.sender_role === "admin" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.sender_role === "admin" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-1 text-[10px] ${m.sender_role === "admin" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {activeUserId && (
            <form onSubmit={(e) => { e.preventDefault(); sendReply(); }} className="flex items-end gap-2 border-t border-border p-3">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                rows={2}
                placeholder="Skriv svar …"
                className="min-h-0 resize-none"
              />
              <Button type="submit" disabled={!reply.trim() || sending} size="icon" className="h-10 w-10 shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
