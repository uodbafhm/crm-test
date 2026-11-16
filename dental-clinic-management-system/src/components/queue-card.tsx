"use client";

import { ArrowLeft, ListOrdered, Timer } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import type { QueueStatusDto } from "@/lib/types";
import { patientName } from "@/lib/types";
import { SectionTitle } from "@/components/ui";

export function QueueCard() {
  const [data, setData] = useState<QueueStatusDto | null>(null);

  const load = useCallback(() => {
    apiGet<QueueStatusDto>("/api/queue").then(setData).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 30_000);
    return () => clearInterval(i);
  }, [load]);

  if (!data) return null;

  const { current, waiting } = data;

  return (
    <div className="card p-5">
      <SectionTitle
        icon={<ListOrdered className="w-4 h-4" />}
        title="طابور الانتظار (Walk-in)"
        action={
          <Link href="/queue" className="text-[11px] font-extrabold text-primary flex items-center gap-1 hover:underline">
            إدارة الطابور <ArrowLeft className="w-3 h-3" />
          </Link>
        }
      />

      {/* current */}
      <div className="rounded-2xl bg-gradient-to-l from-primary to-primary-deep text-white p-4 flex items-center gap-4 mb-3">
        <span className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-xl font-black" dir="ltr">
          {current ? `#${current.ticketNumber}` : "—"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-teal-200">الآن عند الطبيب</p>
          <p className="text-sm font-extrabold truncate">
            {current ? patientName(current.patient) : "لا أحد حالياً"}
          </p>
        </div>
        <span className="text-[10px] font-black bg-white/15 px-2.5 py-1.5 rounded-lg whitespace-nowrap">
          {data.waitingCount} في الانتظار
        </span>
      </div>

      {/* next two */}
      {waiting.length === 0 ? (
        <p className="text-[11px] font-bold text-ink-soft text-center py-2">
          الطابور فارغ — كل شيء هادئ
        </p>
      ) : (
        <div className="space-y-2">
          {waiting.slice(0, 3).map((e, i) => (
            <div key={e.id} className="flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5">
              <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black ${i === 0 ? "bg-gradient-to-br from-accent to-amber-500 text-white" : "bg-paper border border-line text-ink"}`} dir="ltr">
                #{e.ticketNumber}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-extrabold text-ink truncate">{patientName(e.patient)}</p>
                <p className="text-[10px] font-bold text-ink-soft truncate">{e.reason}</p>
              </div>
              <span className="text-[9px] font-extrabold text-amber-700 flex items-center gap-1 shrink-0">
                <Timer className="w-3 h-3" /> {Math.max(0, Math.round((Date.now() - new Date(e.arrivedAt).getTime()) / 60000))} د
              </span>
            </div>
          ))}
          {waiting.length > 3 && (
            <p className="text-[10px] font-bold text-ink-soft text-center">+{waiting.length - 3} آخرون...</p>
          )}
        </div>
      )}
    </div>
  );
}
