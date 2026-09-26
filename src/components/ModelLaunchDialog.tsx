import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  FORBIDDEN_EXTRA_FLAGS,
  getInstallStatus,
  getLaunchExtras,
  getSwapCompatibility,
  getLlamaHelp,
  getLlamaLog,
  getLlamaMetrics,
  installRelease,
  listArtifacts,
  listBinaries,
  listGpus,
  listReleases,
  previewLaunch,
  profileNames,
  saveBinaryPath,
  saveLaunchProfile,
  saveModelsPreset,
  sanitizeAppliedLaunch,
  validateLaunch,
  type Artifacts,
  type GpuInfo,
  type InstallStatus,
  type LlamaHelpFlag,
  type LlamaLaunch,
  type LaunchPreview,
  type SwapCompatibility,
} from '../services/llamaLaunchService';

interface ModelLaunchDialogProps {
  open: boolean;
  modelId: string;
  modelName?: string;
  onClose: () => void;
  onStart: (options: { launch?: LlamaLaunch; launchProfile?: string }) => Promise<void>;
  /** Сейчас загружена другая модель — предложить POST /api/model/swap. */
  activeModelId?: string | null;
  onSwap?: () => Promise<void>;
}

interface PresetRow {
  id: string;
  path: string;
  mmproj: string;
  contextSize: string;
  gpuLayers: string;
}

type DiagTab = 'log' | 'metrics';

const emptyLaunch = (): LlamaLaunch => ({});
const emptyArtifacts: Artifacts = { models: [], mmproj: [], draft: [] };
const emptyPresetRow = (): PresetRow => ({ id: '', path: '', mmproj: '', contextSize: '', gpuLayers: '' });
const selectClass = 'mt-1 h-9 w-full rounded-xl border border-border bg-background px-2 text-sm';
const sectionClass = 'sm:col-span-2 rounded-xl border border-border p-3 space-y-2';

const presetIdFromPath = (path: string) =>
  (path.split(/[\\/]/).pop() || path).replace(/\.gguf$/i, '');

const REASONING_OPTIONS = ['on', 'off', 'auto'];
const REASONING_FORMAT_OPTIONS = ['deepseek', 'none', 'auto'];
const SPEC_TYPE_OPTIONS = ['draft', 'ngram', 'mtp'];
const CACHE_TYPE_OPTIONS = ['f32', 'f16', 'bf16', 'q8_0', 'q4_0', 'q4_1', 'q5_0', 'q5_1', 'iq4_nl'];
const ROPE_SCALING_OPTIONS = ['none', 'linear', 'yarn'];

const envToText = (env?: Record<string, string>) =>
  Object.entries(env ?? {})
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

function parseEnv(text: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) throw new Error(`env: строка «${trimmed}» не в формате KEY=VALUE`);
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function parseKwargs(text: string): Record<string, unknown> | undefined {
  if (!text.trim()) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('chat-template-kwargs: невалидный JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('chat-template-kwargs: нужен JSON-объект');
  }
  return parsed as Record<string, unknown>;
}

export const ModelLaunchDialog: React.FC<ModelLaunchDialogProps> = ({
  open,
  modelId,
  modelName,
  onClose,
  onStart,
  activeModelId,
  onSwap,
}) => {
  const [launch, setLaunch] = useState<LlamaLaunch>(emptyLaunch);
  const [profile, setProfile] = useState('');
  const [profiles, setProfiles] = useState<string[]>([]);
  const [profileName, setProfileName] = useState('');
  const [preview, setPreview] = useState<LaunchPreview | null>(null);
  const [releases, setReleases] = useState<Array<{ name?: string; url: string; variant?: string }>>([]);
  const [binaries, setBinaries] = useState<string[]>([]);
  const [artifacts, setArtifacts] = useState<Artifacts>(emptyArtifacts);
  const [gpuInfo, setGpuInfo] = useState<GpuInfo | null>(null);
  const [helpFlags, setHelpFlags] = useState<LlamaHelpFlag[]>([]);
  const [helpQuery, setHelpQuery] = useState('');
  const [helpValue, setHelpValue] = useState('');
  const [installStatus, setInstallStatus] = useState<InstallStatus | null>(null);
  const [presetOpen, setPresetOpen] = useState(false);
  const [presetName, setPresetName] = useState('router');
  const [presetDefaults, setPresetDefaults] = useState({ contextSize: '', gpuLayers: '' });
  const [presetRows, setPresetRows] = useState<PresetRow[]>([emptyPresetRow()]);
  const [diagTab, setDiagTab] = useState<DiagTab | null>(null);
  const [diagText, setDiagText] = useState('');
  const [diagLoading, setDiagLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [extraArgsText, setExtraArgsText] = useState('');
  const [envText, setEnvText] = useState('');
  const [kwargsText, setKwargsText] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [swapCheck, setSwapCheck] = useState<SwapCompatibility | null>(null);
  const installTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopInstallPolling = useCallback(() => {
    if (installTimerRef.current) clearTimeout(installTimerRef.current);
    installTimerRef.current = null;
  }, []);

  const refreshBinaries = useCallback(async () => {
    const bins = await listBinaries().catch(() => null);
    setBinaries(
      (bins?.binaries ?? [])
        .map((row) => (typeof row === 'string' ? row : row.path ?? ''))
        .filter(Boolean)
    );
  }, []);

  const pollInstall = useCallback(async () => {
    stopInstallPolling();
    try {
      const status = await getInstallStatus();
      setInstallStatus(status);
      if (status.running) {
        installTimerRef.current = setTimeout(() => void pollInstall(), 2000);
      } else {
        void refreshBinaries();
      }
    } catch (err) {
      setInstallStatus({ state: 'error', running: false, error: err instanceof Error ? err.message : String(err) });
    }
  }, [refreshBinaries, stopInstallPolling]);

  useEffect(() => {
    if (!open) {
      stopInstallPolling();
      return;
    }
    setError(null);
    setNotice(null);
    setPreview(null);
    setSwapCheck(null);
    setDiagTab(null);
    setDiagText('');
    void (async () => {
      try {
        const [extras, rel, arts, gpus, help] = await Promise.all([
          getLaunchExtras().catch(() => null),
          listReleases().catch(() => []),
          listArtifacts().catch(() => emptyArtifacts),
          listGpus().catch(() => null),
          getLlamaHelp().catch(() => []),
          refreshBinaries(),
        ]);
        setProfiles(profileNames(extras));
        const last = extras?.lastApplied?.launch;
        if (last) {
          const { extraArgs, env, chatTemplateKwargs, ...rest } = sanitizeAppliedLaunch(last);
          setLaunch(rest);
          setExtraArgsText((extraArgs ?? []).join(' '));
          setEnvText(envToText(env));
          setKwargsText(chatTemplateKwargs ? JSON.stringify(chatTemplateKwargs) : '');
        }
        if (extras?.lastApplied?.launchProfile) setProfile(extras.lastApplied.launchProfile);
        setReleases(rel);
        setArtifacts(arts);
        setGpuInfo(gpus);
        setHelpFlags(help);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить параметры запуска');
      }
    })();
    void pollInstall();
    return stopInstallPolling;
  }, [open, pollInstall, refreshBinaries, stopInstallPolling]);

  const patch = (partial: LlamaLaunch) => setLaunch((prev) => ({ ...prev, ...partial }));

  const extraArgsTokens = useMemo(
    () => extraArgsText.split(/\s+/).map((token) => token.trim()).filter(Boolean),
    [extraArgsText]
  );

  const forbiddenInExtra = useMemo(
    () => extraArgsTokens.filter((token) => FORBIDDEN_EXTRA_FLAGS.has(token.split('=')[0] ?? token)),
    [extraArgsTokens]
  );

  const bodyLaunch = () => {
    const next = compactLaunch({
      ...launch,
      extraArgs: extraArgsTokens,
      env: parseEnv(envText),
      chatTemplateKwargs: parseKwargs(kwargsText),
    });
    const problems = validateLaunch(next);
    if (problems.length) throw new Error(problems.join('; '));
    return next;
  };

  const run = async (action: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  };

  const requestBody = () => {
    const next = bodyLaunch();
    return {
      ...(profile ? { launchProfile: profile } : {}),
      ...(Object.keys(next).length ? { launch: next } : {}),
    };
  };

  const handlePreview = () =>
    run(async () => {
      setPreview(await previewLaunch({ modelId, ...requestBody() }));
    }, 'Превью не удалось');

  const handleSaveProfile = () => {
    const name = profileName.trim();
    if (!name) return;
    void run(async () => {
      await saveLaunchProfile(name, bodyLaunch());
      setProfiles((prev) => (prev.includes(name) ? prev : [...prev, name]));
      setProfile(name);
    }, 'Не удалось сохранить профиль');
  };

  const handleDeleteProfile = () => {
    if (!profile) return;
    void run(async () => {
      await deleteLaunchProfile(profile);
      setProfiles((prev) => prev.filter((name) => name !== profile));
      setProfile('');
    }, 'Не удалось удалить профиль');
  };

  const handleStart = () =>
    run(async () => {
      await onStart(requestBody());
      onClose();
    }, 'Запуск не удался');

  const canSwap = Boolean(onSwap && activeModelId && activeModelId !== modelId);

  const handleSwapCheck = () =>
    run(async () => {
      setSwapCheck(await getSwapCompatibility(modelId));
    }, 'Не удалось проверить совместимость');

  const handleSwap = () =>
    run(async () => {
      if (!onSwap) return;
      await onSwap();
      onClose();
    }, 'Swap не удался');

  const handleInstall = (url: string) =>
    run(async () => {
      await installRelease(url);
      setInstallStatus({ state: 'pending', running: true });
      installTimerRef.current = setTimeout(() => void pollInstall(), 1000);
    }, 'Установка не стартовала');

  const handleSavePreset = () =>
    run(async () => {
      const name = presetName.trim();
      const rows = presetRows.filter((row) => row.path.trim());
      if (!name) throw new Error('Укажите имя INI');
      if (rows.length === 0) throw new Error('Добавьте хотя бы одну модель с путём .gguf');
      const defaults = compactLaunch({
        contextSize: num(presetDefaults.contextSize),
        gpuLayers: num(presetDefaults.gpuLayers),
      }) as Record<string, unknown>;
      const path = await saveModelsPreset({
        name,
        ...(Object.keys(defaults).length ? { defaults } : {}),
        models: rows.map((row) => ({
          id: row.id.trim() || presetIdFromPath(row.path),
          path: row.path.trim(),
          ...(row.mmproj.trim() ? { mmproj: row.mmproj.trim() } : {}),
          ...(num(row.contextSize) !== undefined ? { contextSize: num(row.contextSize) } : {}),
          ...(num(row.gpuLayers) !== undefined ? { gpuLayers: num(row.gpuLayers) } : {}),
        })),
      });
      patch({ router: true, modelsPreset: path || name, hfRepo: undefined, hfFile: undefined });
      setNotice(`INI сохранён: ${path || name}. Роутер включён.`);
    }, 'Не удалось сохранить INI');

  const patchPresetRow = (index: number, partial: Partial<PresetRow>) =>
    setPresetRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...partial } : row)));

  const selectedHelpFlag = useMemo(() => {
    const query = helpQuery.trim();
    return helpFlags.find((row) => row.flag === query || row.aliases.includes(query)) ?? null;
  }, [helpFlags, helpQuery]);

  const handleAddFlag = () => {
    const flag = selectedHelpFlag?.flag ?? helpQuery.trim();
    if (!flag.startsWith('-')) return;
    if (FORBIDDEN_EXTRA_FLAGS.has(flag)) {
      setError(`${flag} задаётся полем формы, не через extraArgs`);
      return;
    }
    const value = helpValue.trim();
    if (selectedHelpFlag?.takesValue && !value) {
      setError(`${flag} требует значение`);
      return;
    }
    if (/\s|[;&|`$<>]/.test(value)) {
      setError('Значение флага без пробелов и shell-символов');
      return;
    }
    setError(null);
    setExtraArgsText((text) => [text.trim(), flag, value].filter(Boolean).join(' '));
    setHelpQuery('');
    setHelpValue('');
  };

  const loadDiag = useCallback(async (tab: DiagTab) => {
    setDiagTab(tab);
    setDiagLoading(true);
    try {
      setDiagText(tab === 'log' ? await getLlamaLog(200) : await getLlamaMetrics());
    } catch (err) {
      setDiagText(err instanceof Error ? err.message : String(err));
    } finally {
      setDiagLoading(false);
    }
  }, []);

  const applyGpuSplit = () => {
    if (!gpuInfo) return;
    patch({
      ...(gpuInfo.tensorSplit ? { tensorSplit: gpuInfo.tensorSplit } : {}),
      ...(gpuInfo.order ? { cudaVisibleDevices: gpuInfo.order } : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && !busy && onClose()}>
      <DialogContent className="max-w-3xl max-h-[min(90vh,52rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Запуск модели</DialogTitle>
          <DialogDescription>
            {modelName || modelId}. Пустые поля не меняют зашитый профиль llama-server.
          </DialogDescription>
        </DialogHeader>

        {canSwap && (
          <div className="rounded-xl border border-border p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium mr-auto">
                Сменить {activeModelId} → {modelName || modelId} с сохранением сессий (swap)
              </span>
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void handleSwapCheck()}>
                Проверить совместимость
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Swap сохраняет in-memory сессии и откатывается на текущую модель при ошибке. Флаги запуска ниже к swap не
              применяются — для них используйте «Запустить».
            </p>
            {swapCheck && (
              <div className="space-y-1 text-xs">
                <p className={swapCheck.modelCompatible ? 'text-muted-foreground' : 'text-destructive'}>
                  Модель: {swapCheck.modelCompatible ? 'совместима' : 'несовместима'}
                  {swapCheck.reason ? ` — ${swapCheck.reason}` : ''}
                </p>
                <p className="text-muted-foreground">Активных сессий: {swapCheck.activeSessions}</p>
                {(swapCheck.willDropIncompatible || swapCheck.sessionWouldBeDropped) && (
                  <p className="text-amber-600 dark:text-amber-400">
                    Несовместимые сессии будут сброшены при swap. История чатов в БД сохранится.
                  </p>
                )}
                {swapCheck.forceRequired && (
                  <p className="text-destructive">Swap без force невозможен — используйте «Запустить» (load с force).</p>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant={swapCheck.willDropIncompatible ? 'destructive' : 'default'}
                  disabled={busy || swapCheck.forceRequired || !swapCheck.modelCompatible}
                  onClick={() => void handleSwap()}
                >
                  {swapCheck.willDropIncompatible ? 'Swap со сбросом несовместимых сессий' : 'Выполнить swap'}
                </Button>
              </div>
            )}
          </div>
        )}

        <datalist id="launch-artifacts-models">
          {artifacts.models.map((row) => (
            <option key={row.path} value={row.path}>{row.name}</option>
          ))}
        </datalist>
        <datalist id="launch-artifacts-mmproj">
          {artifacts.mmproj.map((row) => (
            <option key={row.path} value={row.path}>{row.name}</option>
          ))}
        </datalist>
        <datalist id="launch-artifacts-draft">
          {[...artifacts.draft, ...artifacts.models].map((row) => (
            <option key={`d-${row.path}`} value={row.path}>{row.name}</option>
          ))}
        </datalist>
        <datalist id="launch-help-flags">
          {helpFlags.map((row) => (
            <option key={row.flag} value={row.flag}>
              {[row.aliases.join(' '), row.description].filter(Boolean).join(' — ').slice(0, 140)}
            </option>
          ))}
        </datalist>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2 text-xs text-muted-foreground">
            Профиль
            <select
              className={selectClass}
              value={profile}
              onChange={(event) => {
                setProfile(event.target.value);
                setLaunch(emptyLaunch());
                setExtraArgsText('');
                setEnvText('');
                setKwargsText('');
                setNotice(event.target.value ? 'Поля ниже накладываются поверх профиля. Пустые — берутся из профиля.' : null);
              }}
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
          <Field label="threads" value={launch.threads} onChange={(value) => patch({ threads: num(value) })} />

          <div className={sectionClass}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium">GPU</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!gpuInfo?.tensorSplit && !gpuInfo?.order}
                onClick={applyGpuSplit}
              >
                Подставить tensor-split
              </Button>
            </div>
            {gpuInfo?.gpus.length ? (
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {gpuInfo.gpus.map((gpu) => (
                  <li key={gpu.index}>
                    #{gpu.index} {gpu.name}
                    {gpu.freeGb !== undefined && ` — свободно ${gpu.freeGb.toFixed(1)} ГБ`}
                    {gpu.totalGb !== undefined && ` из ${gpu.totalGb.toFixed(1)} ГБ`}
                  </li>
                ))}
                {gpuInfo.tensorSplit && <li>Предложение: tensor-split {gpuInfo.tensorSplit}</li>}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">nvidia-smi не вернул GPU</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="tensor-split" value={launch.tensorSplit} onChange={(value) => patch({ tensorSplit: value })} />
              <Field
                label="CUDA_VISIBLE_DEVICES"
                value={launch.cudaVisibleDevices}
                onChange={(value) => patch({ cudaVisibleDevices: value })}
              />
            </div>
          </div>

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
          <SelectField
            label="reasoning"
            value={launch.reasoning}
            options={REASONING_OPTIONS}
            onChange={(value) => patch({ reasoning: (value || undefined) as LlamaLaunch['reasoning'] })}
          />
          <SelectField
            label="reasoning-format"
            value={launch.reasoningFormat}
            options={REASONING_FORMAT_OPTIONS}
            onChange={(value) => patch({ reasoningFormat: value || undefined })}
          />
          <Field label="reasoning-budget" value={launch.reasoningBudget} onChange={(value) => patch({ reasoningBudget: num(value) })} />
          <Field label="chat-template" value={launch.chatTemplate} onChange={(value) => patch({ chatTemplate: value })} />
          <label className="sm:col-span-2 text-xs text-muted-foreground">
            chat-template-kwargs (JSON)
            <FormInput
              value={kwargsText}
              onChange={(event) => setKwargsText(event.target.value)}
              placeholder='{"enable_thinking": false}'
            />
          </label>
          <Field label="mmproj" list="launch-artifacts-mmproj" value={launch.mmproj} onChange={(value) => patch({ mmproj: value })} />
          <Field
            label="draft model"
            list="launch-artifacts-draft"
            value={launch.draftModel}
            onChange={(value) => patch({ draftModel: value })}
          />
          <Field label="draft-max" value={launch.draftMax} onChange={(value) => patch({ draftMax: num(value) })} />
          <SelectField
            label="spec-type"
            value={launch.specType}
            options={SPEC_TYPE_OPTIONS}
            onChange={(value) => patch({ specType: value || undefined })}
          />
          <Field
            label="n-gpu-layers-draft"
            value={launch.draftGpuLayers}
            onChange={(value) => patch({ draftGpuLayers: num(value) })}
          />
          <Field label="hf-repo" value={launch.hfRepo} onChange={(value) => patch({ hfRepo: value })} />
          <Field label="hf-file" value={launch.hfFile} onChange={(value) => patch({ hfFile: value })} />
          <Field label="models-preset" value={launch.modelsPreset} onChange={(value) => patch({ modelsPreset: value })} />
          <Field label="models-max" value={launch.modelsMax} onChange={(value) => patch({ modelsMax: num(value) })} />

          <div className={sectionClass}>
            <button
              type="button"
              className="flex w-full items-center justify-between text-xs font-medium"
              onClick={() => setAdvancedOpen((value) => !value)}
            >
              Расширенные флаги (MoE, batch, KV-cache, RoPE, env, api-key)
              <span className="text-muted-foreground">{advancedOpen ? 'Скрыть' : 'Открыть'}</span>
            </button>
            {advancedOpen && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="main-gpu" value={launch.mainGpu} onChange={(value) => patch({ mainGpu: num(value) })} />
                <Field label="n-cpu-moe" value={launch.nCpuMoe} onChange={(value) => patch({ nCpuMoe: num(value) })} />
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" checked={Boolean(launch.cpuMoe)} onChange={(event) => patch({ cpuMoe: event.target.checked })} />
                  --cpu-moe (все MoE-эксперты на CPU)
                </label>
                <Field label="batch-size" value={launch.batchSize} onChange={(value) => patch({ batchSize: num(value) })} />
                <Field label="ubatch-size" value={launch.ubatchSize} onChange={(value) => patch({ ubatchSize: num(value) })} />
                <Field label="threads-batch" value={launch.threadsBatch} onChange={(value) => patch({ threadsBatch: num(value) })} />
                <Field
                  label="defrag-thold (0–1)"
                  value={launch.defragThold}
                  onChange={(value) => patch({ defragThold: num(value) })}
                />
                <SelectField
                  label="cache-type-k"
                  value={launch.cacheTypeK}
                  options={CACHE_TYPE_OPTIONS}
                  onChange={(value) => patch({ cacheTypeK: value || undefined })}
                />
                <SelectField
                  label="cache-type-v"
                  value={launch.cacheTypeV}
                  options={CACHE_TYPE_OPTIONS}
                  onChange={(value) => patch({ cacheTypeV: value || undefined })}
                />
                <TriStateField label="--mlock" value={launch.mlock} onChange={(value) => patch({ mlock: value })} />
                <TriStateField label="--no-mmap" value={launch.noMmap} onChange={(value) => patch({ noMmap: value })} />
                <TriStateField label="--embedding" value={launch.embedding} onChange={(value) => patch({ embedding: value })} />
                <SelectField
                  label="rope-scaling"
                  value={launch.ropeScaling}
                  options={ROPE_SCALING_OPTIONS}
                  onChange={(value) => patch({ ropeScaling: value || undefined })}
                />
                <Field label="rope-scale" value={launch.ropeScale} onChange={(value) => patch({ ropeScale: num(value) })} />
                <Field label="rope-freq-base" value={launch.ropeFreqBase} onChange={(value) => patch({ ropeFreqBase: num(value) })} />
                <label className="text-xs text-muted-foreground">
                  api-key
                  <FormInput
                    type="password"
                    autoComplete="new-password"
                    value={launch.apiKey ?? ''}
                    onChange={(event) => patch({ apiKey: event.target.value || undefined })}
                    placeholder="не менять"
                  />
                </label>
                <label className="sm:col-span-2 text-xs text-muted-foreground">
                  env (KEY=VALUE по строке; CUDA_*, GGML_*, HF_TOKEN; до 20)
                  <textarea
                    className="mt-1 w-full min-h-[4.5rem] rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono"
                    value={envText}
                    onChange={(event) => setEnvText(event.target.value)}
                    placeholder={'GGML_CUDA_FORCE_MMQ=1\nHF_TOKEN=hf_...'}
                  />
                </label>
              </div>
            )}
          </div>

          <div className={sectionClass}>
            <button
              type="button"
              className="flex w-full items-center justify-between text-xs font-medium"
              onClick={() => setPresetOpen((value) => !value)}
            >
              INI роутера (--models-preset)
              <span className="text-muted-foreground">{presetOpen ? 'Скрыть' : 'Открыть'}</span>
            </button>
            {presetOpen && (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Имя INI" value={presetName} onChange={setPresetName} />
                  <Field
                    label="ctx-size по умолчанию"
                    value={presetDefaults.contextSize}
                    onChange={(value) => setPresetDefaults((prev) => ({ ...prev, contextSize: value }))}
                  />
                  <Field
                    label="gpu layers по умолчанию"
                    value={presetDefaults.gpuLayers}
                    onChange={(value) => setPresetDefaults((prev) => ({ ...prev, gpuLayers: value }))}
                  />
                </div>
                {presetRows.map((row, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_2fr_2fr_5rem_5rem_auto] items-end">
                    <Field label="id" value={row.id} onChange={(value) => patchPresetRow(index, { id: value })} />
                    <Field
                      label="path .gguf"
                      list="launch-artifacts-models"
                      value={row.path}
                      onChange={(value) => patchPresetRow(index, { path: value })}
                    />
                    <Field
                      label="mmproj"
                      list="launch-artifacts-mmproj"
                      value={row.mmproj}
                      onChange={(value) => patchPresetRow(index, { mmproj: value })}
                    />
                    <Field label="ctx" value={row.contextSize} onChange={(value) => patchPresetRow(index, { contextSize: value })} />
                    <Field label="ngl" value={row.gpuLayers} onChange={(value) => patchPresetRow(index, { gpuLayers: value })} />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={presetRows.length === 1}
                      onClick={() => setPresetRows((rows) => rows.filter((_, i) => i !== index))}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setPresetRows((rows) => [...rows, emptyPresetRow()])}>
                    Добавить модель
                  </Button>
                  <Button type="button" size="sm" disabled={busy} onClick={() => void handleSavePreset()}>
                    Сохранить INI и включить роутер
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Первая секция INI станет моделью чата. Пустой id берётся из имени файла.
                </p>
              </>
            )}
          </div>

          <label className="sm:col-span-2 text-xs text-muted-foreground">
            Бинарник
            <select className={selectClass} value={launch.binaryPath ?? ''} onChange={(event) => patch({ binaryPath: event.target.value })}>
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

          <div className={sectionClass}>
            <span className="text-xs font-medium">Флаги из llama-server --help</span>
            {helpFlags.length === 0 ? (
              <p className="text-xs text-muted-foreground">Список флагов не получен</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto] items-end">
                <Field label="флаг" list="launch-help-flags" value={helpQuery} onChange={setHelpQuery} placeholder="--prio" />
                <Field
                  label={selectedHelpFlag?.takesValue ? 'значение' : 'значение (не нужно)'}
                  value={helpValue}
                  onChange={setHelpValue}
                  disabled={Boolean(selectedHelpFlag && !selectedHelpFlag.takesValue)}
                />
                <Button type="button" variant="outline" size="sm" disabled={!helpQuery.trim().startsWith('-')} onClick={handleAddFlag}>
                  В extraArgs
                </Button>
              </div>
            )}
            {selectedHelpFlag?.description && <p className="text-xs text-muted-foreground">{selectedHelpFlag.description}</p>}
            <label className="block text-xs text-muted-foreground">
              extraArgs
              <FormInput value={extraArgsText} onChange={(event) => setExtraArgsText(event.target.value)} placeholder="--prio 2" />
            </label>
            {forbiddenInExtra.length > 0 && (
              <p className="text-xs text-destructive">Задайте полями формы, не через extraArgs: {forbiddenInExtra.join(', ')}</p>
            )}
          </div>

          <div className="sm:col-span-2 flex flex-wrap gap-2 items-end">
            <label className="text-xs text-muted-foreground flex-1">
              Сохранить профиль
              <FormInput value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="moe" />
            </label>
            <Button type="button" variant="outline" disabled={busy || !profileName.trim()} onClick={handleSaveProfile}>
              Сохранить
            </Button>
            <Button type="button" variant="outline" disabled={busy || !profile} onClick={handleDeleteProfile}>
              Удалить
            </Button>
          </div>

          <div className={sectionClass}>
            <span className="text-xs font-medium">Сборки llama-server</span>
            {releases.length > 0 && (
              <label className="block text-xs text-muted-foreground">
                Официальная сборка (CPU / Vulkan / ROCm)
                <select
                  className={selectClass}
                  value=""
                  disabled={busy || Boolean(installStatus?.running)}
                  onChange={(event) => event.target.value && void handleInstall(event.target.value)}
                >
                  <option value="">Выбрать для установки</option>
                  {releases.map((row) => (
                    <option key={row.url} value={row.url}>
                      {row.variant || row.name || row.url}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {installStatus && <InstallStatusLine status={installStatus} />}
            {binaries[0] && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => {
                  const path = launch.binaryPath || binaries[0];
                  if (!path) return;
                  void run(async () => {
                    await saveBinaryPath(path);
                    setNotice(`Запомнен бинарник: ${path}`);
                  }, 'Не удалось запомнить бинарник');
                }}
              >
                Запомнить выбранный бинарник
              </Button>
            )}
          </div>

          <div className={sectionClass}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium mr-auto">Диагностика llama-server</span>
              <Button type="button" variant={diagTab === 'log' ? 'default' : 'outline'} size="sm" onClick={() => void loadDiag('log')}>
                Лог (200 строк)
              </Button>
              <Button
                type="button"
                variant={diagTab === 'metrics' ? 'default' : 'outline'}
                size="sm"
                onClick={() => void loadDiag('metrics')}
              >
                Метрики
              </Button>
              {diagTab && (
                <Button type="button" variant="outline" size="sm" disabled={diagLoading} onClick={() => void loadDiag(diagTab)}>
                  Обновить
                </Button>
              )}
            </div>
            {diagTab && (
              <pre className="max-h-64 overflow-auto rounded-lg bg-muted/50 p-2 text-[11px] leading-snug whitespace-pre-wrap break-all">
                {diagLoading ? 'Загрузка…' : diagText || 'Пусто'}
              </pre>
            )}
            {diagTab === 'metrics' && !launch.metrics && (
              <p className="text-xs text-muted-foreground">Метрики отдаются, только если llama-server запущен с --metrics.</p>
            )}
          </div>
        </div>

        {preview && (
          <pre className="max-h-40 overflow-auto rounded-xl bg-muted/50 p-3 text-[11px] whitespace-pre-wrap">
            {(preview.args ?? []).join(' ')}
            {preview.binary ? `\nbinary: ${preview.binary}` : ''}
            {preview.cudaVisibleDevices ? `\nCUDA_VISIBLE_DEVICES: ${preview.cudaVisibleDevices}` : ''}
            {preview.envKeys?.length ? `\nenv: ${preview.envKeys.join(', ')}` : ''}
            {preview.routerModel ? `\nrouter: ${preview.routerModel}` : ''}
          </pre>
        )}
        {notice && <p className="text-sm text-emerald-600 dark:text-emerald-400">{notice}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
            Отмена
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void handlePreview()}>
            Превью argv
          </Button>
          <Button type="button" disabled={busy || forbiddenInExtra.length > 0} onClick={() => void handleStart()}>
            {busy ? 'Запуск…' : 'Запустить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function InstallStatusLine({ status }: { status: InstallStatus }) {
  if (!status.running && ['idle', 'none'].includes(status.state) && !status.error) {
    return <p className="text-xs text-muted-foreground">Установка не идёт</p>;
  }
  return (
    <div className="space-y-1 text-xs">
      <p className={status.error ? 'text-destructive' : 'text-muted-foreground'}>
        Установка: {status.state}
        {status.progress !== undefined && ` — ${Math.round(status.progress)}%`}
        {status.message && ` — ${status.message}`}
        {status.error && ` — ${status.error}`}
        {!status.running && status.path && ` — ${status.path}`}
      </p>
      {status.running && status.progress !== undefined && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, status.progress)}%` }} />
        </div>
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs text-muted-foreground">
      {label}
      <select className={selectClass} value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">по профилю</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Для mlock / noMmap / embedding `false` снимает флаг профиля, поэтому нужны три состояния. */
function TriStateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: boolean;
  onChange: (value: boolean | undefined) => void;
}) {
  return (
    <label className="text-xs text-muted-foreground">
      {label}
      <select
        className={selectClass}
        value={value === undefined ? '' : String(value)}
        onChange={(event) => onChange(event.target.value === '' ? undefined : event.target.value === 'true')}
      >
        <option value="">по профилю</option>
        <option value="true">включить</option>
        <option value="false">снять</option>
      </select>
    </label>
  );
}

function num(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function Field({
  label,
  value,
  onChange,
  list,
  placeholder,
  disabled,
}: {
  label: string;
  value?: string | number;
  onChange: (value: string) => void;
  list?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="text-xs text-muted-foreground">
      {label}
      <FormInput
        value={value ?? ''}
        list={list}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
