import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { FormInput } from './ui/form-field';
import {
  compactLaunch,
  deleteLaunchProfile,
  getLaunchExtras,
  installRelease,
  listBinaries,
  listReleases,
  previewLaunch,
  profileNames,
  saveBinaryPath,
  saveLaunchProfile,
  type LlamaLaunch,
  type LaunchPreview,
} from '../services/llamaLaunchService';

interface ModelLaunchDialogProps {
  open: boolean;
  modelId: string;
  modelName?: string;
  onClose: () => void;
  onStart: (options: { launch?: LlamaLaunch; launchProfile?: string }) => Promise<void>;
}

const emptyLaunch = (): LlamaLaunch => ({});

export const ModelLaunchDialog: React.FC<ModelLaunchDialogProps> = ({
  open,
  modelId,
  modelName,
  onClose,
  onStart,
}) => {
  const [launch, setLaunch] = useState<LlamaLaunch>(emptyLaunch);
  const [profile, setProfile] = useState('');
  const [profiles, setProfiles] = useState<string[]>([]);
  const [profileName, setProfileName] = useState('');
  const [preview, setPreview] = useState<LaunchPreview | null>(null);
  const [releases, setReleases] = useState<Array<{ name?: string; url: string; variant?: string }>>([]);
  const [binaries, setBinaries] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraArgsText, setExtraArgsText] = useState('');

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPreview(null);
    void (async () => {
      try {
        const [extras, bins, rel] = await Promise.all([
          getLaunchExtras().catch(() => null),
          listBinaries().catch(() => null),
          listReleases().catch(() => []),
        ]);
        setProfiles(profileNames(extras));
        const last = extras?.lastApplied?.launch;
        if (last) setLaunch(last);
        if (extras?.lastApplied?.launchProfile) setProfile(extras.lastApplied.launchProfile);
        const paths = (bins?.binaries ?? [])
          .map((row) => (typeof row === 'string' ? row : row.path ?? ''))
          .filter(Boolean);
        setBinaries(paths);
        setReleases(rel);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить параметры запуска');
      }
    })();
  }, [open]);

  const patch = (partial: LlamaLaunch) => setLaunch((prev) => ({ ...prev, ...partial }));

  const bodyLaunch = () => {
    const extraArgs = extraArgsText
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);
    return compactLaunch({ ...launch, ...(extraArgs.length ? { extraArgs } : {}) });
  };

  const handlePreview = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = bodyLaunch();
      setPreview(
        await previewLaunch({
          modelId,
          ...(profile ? { launchProfile: profile } : {}),
          ...(Object.keys(next).length ? { launch: next } : {}),
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Превью не удалось');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProfile = async () => {
    const name = profileName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      await saveLaunchProfile(name, bodyLaunch());
      setProfiles((prev) => (prev.includes(name) ? prev : [...prev, name]));
      setProfile(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить профиль');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      await deleteLaunchProfile(profile);
      setProfiles((prev) => prev.filter((name) => name !== profile));
      setProfile('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить профиль');
    } finally {
      setBusy(false);
    }
  };

  const handleStart = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = bodyLaunch();
      await onStart({
        ...(profile ? { launchProfile: profile } : {}),
        ...(Object.keys(next).length ? { launch: next } : {}),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Запуск не удался');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && !busy && onClose()}>
      <DialogContent className="max-w-2xl max-h-[min(90vh,48rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Запуск модели</DialogTitle>
          <DialogDescription>
            {modelName || modelId}. Пустые поля не меняют зашитый профиль llama-server.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2 text-xs text-muted-foreground">
            Профиль
            <select
              className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-2 text-sm"
              value={profile}
              onChange={(event) => setProfile(event.target.value)}
            >
              <option value="">Без профиля</option>
              {profiles.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <Field label="ctx-size" value={launch.contextSize} onChange={(value) => patch({ contextSize: num(value) })} />
          <Field label="gpu layers" value={launch.gpuLayers} onChange={(value) => patch({ gpuLayers: num(value) })} />
          <Field label="parallel" value={launch.parallel} onChange={(value) => patch({ parallel: num(value) })} />
          <Field label="tensor-split" value={launch.tensorSplit} onChange={(value) => patch({ tensorSplit: value })} />
          <Field label="threads" value={launch.threads} onChange={(value) => patch({ threads: num(value) })} />
          <Field label="CUDA_VISIBLE_DEVICES" value={launch.cudaVisibleDevices} onChange={(value) => patch({ cudaVisibleDevices: value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={Boolean(launch.fit)} onChange={(event) => patch({ fit: event.target.checked })} />
            --fit on
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={Boolean(launch.jinja)} onChange={(event) => patch({ jinja: event.target.checked })} />
            --jinja
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={Boolean(launch.metrics)} onChange={(event) => patch({ metrics: event.target.checked })} />
            --metrics
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={Boolean(launch.router)} onChange={(event) => patch({ router: event.target.checked })} />
            роутер --models-preset
          </label>
          <Field label="reasoning" value={launch.reasoning} onChange={(value) => patch({ reasoning: value as LlamaLaunch['reasoning'] })} />
          <Field label="reasoning-format" value={launch.reasoningFormat} onChange={(value) => patch({ reasoningFormat: value })} />
          <Field label="chat-template" value={launch.chatTemplate} onChange={(value) => patch({ chatTemplate: value })} />
          <Field label="mmproj" value={launch.mmproj} onChange={(value) => patch({ mmproj: value })} />
          <Field label="hf-repo" value={launch.hfRepo} onChange={(value) => patch({ hfRepo: value })} />
          <Field label="hf-file" value={launch.hfFile} onChange={(value) => patch({ hfFile: value })} />
          <Field label="models-preset" value={launch.modelsPreset} onChange={(value) => patch({ modelsPreset: value })} />
          <Field label="models-max" value={launch.modelsMax} onChange={(value) => patch({ modelsMax: num(value) })} />
          <label className="sm:col-span-2 text-xs text-muted-foreground">
            Бинарник
            <select
              className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-2 text-sm"
              value={launch.binaryPath ?? ''}
              onChange={(event) => patch({ binaryPath: event.target.value })}
            >
              <option value="">LLAMA_SERVER_PATH</option>
              {binaries.map((path) => (
                <option key={path} value={path}>
                  {path}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={Boolean(launch.useSavedBinary)}
              onChange={(event) => patch({ useSavedBinary: event.target.checked })}
            />
            Использовать сохранённый бинарник
          </label>
          <label className="sm:col-span-2 text-xs text-muted-foreground">
            extraArgs
            <FormInput value={extraArgsText} onChange={(event) => setExtraArgsText(event.target.value)} placeholder="--prio 2" />
          </label>
          <div className="sm:col-span-2 flex flex-wrap gap-2 items-end">
            <label className="text-xs text-muted-foreground flex-1">
              Сохранить профиль
              <FormInput value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="moe" />
            </label>
            <Button type="button" variant="outline" disabled={busy || !profileName.trim()} onClick={() => void handleSaveProfile()}>
              Сохранить
            </Button>
            <Button type="button" variant="outline" disabled={busy || !profile} onClick={() => void handleDeleteProfile()}>
              Удалить
            </Button>
          </div>
          {releases.length > 0 && (
            <label className="sm:col-span-2 text-xs text-muted-foreground">
              Официальная сборка (CPU / Vulkan / ROCm)
              <select
                className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-2 text-sm"
                defaultValue=""
                onChange={(event) => {
                  const url = event.target.value;
                  if (!url) return;
                  setBusy(true);
                  void installRelease(url)
                    .catch((err) => setError(err instanceof Error ? err.message : 'Установка не стартовала'))
                    .finally(() => setBusy(false));
                }}
              >
                <option value="">Не ставить</option>
                {releases.map((row) => (
                  <option key={row.url} value={row.url}>
                    {row.variant || row.name || row.url}
                  </option>
                ))}
              </select>
            </label>
          )}
          {binaries[0] && (
            <Button
              type="button"
              variant="outline"
              className="sm:col-span-2 justify-self-start"
              disabled={busy}
              onClick={() => {
                const path = launch.binaryPath || binaries[0];
                if (!path) return;
                setBusy(true);
                void saveBinaryPath(path)
                  .catch((err) => setError(err instanceof Error ? err.message : 'Не удалось запомнить бинарник'))
                  .finally(() => setBusy(false));
              }}
            >
              Запомнить выбранный бинарник
            </Button>
          )}
        </div>

        {preview && (
          <pre className="max-h-40 overflow-auto rounded-xl bg-muted/50 p-3 text-[11px] whitespace-pre-wrap">
            {(preview.args ?? []).join(' ')}
            {preview.binary ? `\nbinary: ${preview.binary}` : ''}
            {preview.routerModel ? `\nrouter: ${preview.routerModel}` : ''}
          </pre>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
            Отмена
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void handlePreview()}>
            Превью argv
          </Button>
          <Button type="button" disabled={busy} onClick={() => void handleStart()}>
            {busy ? 'Запуск…' : 'Запустить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function num(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string | number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs text-muted-foreground">
      {label}
      <FormInput value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
