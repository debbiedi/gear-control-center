import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { Panel } from "@/components/ui/Panel";
import { useT } from "@/i18n";
import { deviceService } from "@/services/device";
import { cn } from "@/lib/cn";
import {
  profileContents,
  type ApplyReport,
  type ProfileStore,
  type Snapshot,
} from "@/types/device";

export function ProfilesPage({ snapshot }: { snapshot: Snapshot | null }) {
  const t = useT();
  const [store, setStore] = useState<ProfileStore | null>(null);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [report, setReport] = useState<{ name: string; report: ApplyReport } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const connected = !!snapshot?.device;

  useEffect(() => {
    void deviceService.listProfiles().then(setStore).catch(() => setStore(null));
  }, []);

  const guard = async (action: () => Promise<ProfileStore>) => {
    setError(null);
    try {
      setStore(await action());
    } catch (e) {
      const detail = (e as { detail?: unknown })?.detail;
      setError(typeof detail === "string" ? detail : String(e));
    }
  };

  const capture = async () => {
    const name = newName.trim();
    if (!name) return;
    await guard(() => deviceService.captureProfile(name));
    setNewName("");
  };

  const apply = async (id: string, name: string) => {
    setError(null);
    try {
      setReport({ name, report: await deviceService.applyProfile(id) });
      setStore(await deviceService.listProfiles());
    } catch (e) {
      const detail = (e as { detail?: unknown })?.detail;
      setError(typeof detail === "string" ? detail : String(e));
    }
  };

  return (
    <div className="space-y-4 p-6">
      <Panel
        legend={t.profiles.savedLegend}
        title={t.profiles.title}
        description={t.profiles.description}
      >
        <div className="mb-5 flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="legend mb-2 block" htmlFor="profile-name">
              {t.profiles.saveAs}
            </label>
            <input
              id="profile-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void capture()}
              placeholder={t.profiles.placeholder}
              disabled={!connected}
              className={cn(
                "well h-9 w-full rounded-md px-3",
                "text-[13.5px] text-ink placeholder:text-ink-faint",
                "focus:border-brass focus:outline-none disabled:opacity-50",
              )}
            />
          </div>
          <Button
            variant="primary"
            icon={<Plus size={14} />}
            onClick={() => void capture()}
            disabled={!connected || !newName.trim()}
          >
            {t.profiles.save}
          </Button>
        </div>

        {!connected && (
          <Notice tone="info" title={t.profiles.noDeviceTitle}>
            {t.profiles.noDeviceBody}
          </Notice>
        )}

        {error && (
          <div className="mb-4">
            <Notice
              tone="fault"
              title={t.profiles.failedTitle}
              onDismiss={() => setError(null)}
            >
              {error}
            </Notice>
          </div>
        )}

        {store && store.profiles.length > 0 ? (
          <ul className="divide-y divide-line">
            {store.profiles.map((profile) => {
              const contents = profileContents(profile.settings, t);
              return (
                <li
                  key={profile.id}
                  className="flex flex-wrap items-center gap-4 py-3 first:pt-0"
                >
                  <div className="min-w-[200px] flex-1">
                    {editing === profile.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editName}
                          autoFocus
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              void guard(() =>
                                deviceService.renameProfile(profile.id, editName),
                              ).then(() => setEditing(null));
                            }
                            if (e.key === "Escape") setEditing(null);
                          }}
                          className="well h-8 rounded-md px-2.5 text-[13.5px] text-ink outline-2 outline-brass focus:outline-none"
                        />
                        <button
                          type="button"
                          aria-label={t.profiles.confirmRename}
                          onClick={() =>
                            void guard(() =>
                              deviceService.renameProfile(profile.id, editName),
                            ).then(() => setEditing(null))
                          }
                          className="rounded p-1.5 text-live hover:bg-panel-3"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label={t.profiles.cancelRename}
                          onClick={() => setEditing(null)}
                          className="rounded p-1.5 text-ink-faint hover:bg-panel-3"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-[14px] font-medium text-ink">
                          {profile.name}
                          {store.lastApplied === profile.id && (
                            <span className="readout ml-2 text-[11px] text-ink-faint">
                              {t.profiles.lastApplied}
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-[12.5px] text-ink-dim">
                          {contents.length
                            ? contents.join(" · ")
                            : t.profiles.nothingStored}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => void apply(profile.id, profile.name)}
                      disabled={!connected || !contents.length}
                    >
                      {t.profiles.apply}
                    </Button>
                    <button
                      type="button"
                      aria-label={t.profiles.rename(profile.name)}
                      onClick={() => {
                        setEditing(profile.id);
                        setEditName(profile.name);
                      }}
                      className="rounded p-2 text-ink-faint hover:bg-panel-2 hover:text-ink"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={t.profiles.remove(profile.name)}
                      onClick={() =>
                        void guard(() => deviceService.deleteProfile(profile.id))
                      }
                      className="rounded p-2 text-ink-faint hover:bg-panel-2 hover:text-fault"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[13px] text-ink-dim">
            {t.profiles.empty}
          </p>
        )}
      </Panel>

      {report && (
        <Panel
          legend={t.profiles.resultLegend}
          title={t.profiles.resultTitle(report.name)}
        >
          {report.report.applied.length > 0 && (
            <p className="text-[13px] text-ink-dim">
              {t.profiles.sent(report.report.applied.join(", "))}
            </p>
          )}
          {report.report.failed.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {report.report.failed.map((f) => (
                <li key={f.setting} className="text-[13px] text-fault">
                  {f.setting} — {f.reason}
                </li>
              ))}
            </ul>
          )}
          {report.report.applied.length === 0 &&
            report.report.failed.length === 0 && (
              <p className="text-[13px] text-ink-dim">
                {t.profiles.nothingSent}
              </p>
            )}
        </Panel>
      )}

      <Panel legend={t.profiles.howLegend} title={t.profiles.howTitle}>
        <div className="space-y-3 text-[13px] leading-relaxed text-ink-dim">
          <p>{t.profiles.howBody1}</p>
          <p>{t.profiles.howBody2}</p>
          <p className="readout text-[12px] text-ink-faint">
            ~/.config/gear-control-center/profiles.json
          </p>
        </div>
      </Panel>
    </div>
  );
}
