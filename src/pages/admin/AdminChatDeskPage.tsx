import React, { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../services/apiClient';
import { adminRatings, adminUsage, createBanner, createGroup, createPreset, listGroups, listPresets, restorePreset, snapshotPreset, type ChatGroup, type ChatPreset } from '../../services/chatDeskService';
import { InlineError, InlineSuccess } from '../../components/ui/alert-banner';
import { PanelCard } from '../../components/ui/panel-card';

function errorText(error: unknown): string {
  return error instanceof ApiError ? error.message : error instanceof Error ? error.message : 'Ошибка запроса';
}

const AdminChatDeskPage: React.FC = () => {
  const today = new Date().toISOString().slice(0, 10);
  const [day, setDay] = useState(today);
  const [usage, setUsage] = useState<unknown[]>([]);
  const [ratings, setRatings] = useState<unknown[]>([]);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [presets, setPresets] = useState<ChatPreset[]>([]);
  const [banner, setBanner] = useState('');
  const [groupName, setGroupName] = useState('');
  const [presetName, setPresetName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    void adminUsage(day).then(setUsage).catch((err: unknown) => setError(errorText(err)));
    void adminRatings().then(setRatings).catch((err: unknown) => setError(errorText(err)));
    void listGroups().then(setGroups).catch((err: unknown) => setError(errorText(err)));
    void listPresets().then(setPresets).catch((err: unknown) => setError(errorText(err)));
  }, [day]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">Рабочий стол чата</h1>
      {message && <InlineSuccess message={message} />}
      {error && <InlineError message={error} />}
      <PanelCard title="Объявление">
        <form className="flex gap-2" onSubmit={(event) => {
          event.preventDefault();
          void createBanner(banner.trim())
            .then(() => {
              setBanner('');
              setMessage('Объявление опубликовано');
              setError(null);
            })
            .catch((err: unknown) => setError(errorText(err)));
        }}>
          <input id="banner-text" name="text" value={banner} onChange={(event) => setBanner(event.target.value)} maxLength={500} placeholder="Текст до 500 символов" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">Опубликовать</button>
        </form>
      </PanelCard>
      <PanelCard title="Токены за день">
        <input id="usage-day" name="day" type="date" value={day} onChange={(event) => setDay(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <pre className="mt-2 max-h-48 overflow-auto text-xs">{JSON.stringify(usage, null, 2)}</pre>
      </PanelCard>
      <PanelCard title="Оценки">
        <pre className="max-h-48 overflow-auto text-xs">{JSON.stringify(ratings, null, 2)}</pre>
      </PanelCard>
      <PanelCard title="Группы">
        <ul className="mb-2 space-y-1 text-sm">
          {groups.map((group) => <li key={group.id}>{group.name}</li>)}
          {groups.length === 0 && <li className="text-muted-foreground">Групп нет.</li>}
        </ul>
        <form className="flex gap-2" onSubmit={(event) => {
          event.preventDefault();
          void createGroup(groupName.trim()).then(() => {
            setGroupName('');
            setMessage('Группа создана');
            load();
          }).catch((err: unknown) => setError(errorText(err)));
        }}>
          <input id="group-name" name="name" value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Имя группы" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg border border-border px-3 py-2 text-sm">Создать</button>
        </form>
      </PanelCard>
      <PanelCard title="Пресеты">
        <ul className="mb-2 space-y-2 text-sm">
          {presets.map((preset) => (
            <li key={preset.id} className="flex flex-wrap items-center gap-2">
              <span>{preset.name}</span>
              <button type="button" className="text-xs underline" onClick={() => void snapshotPreset(preset.id).then(() => setMessage('Снимок записан')).catch((err: unknown) => setError(errorText(err)))}>Снимок</button>
              <button type="button" className="text-xs underline" onClick={() => void restorePreset(preset.id).then(() => setMessage('Версия восстановлена')).catch((err: unknown) => setError(errorText(err)))}>Восстановить</button>
            </li>
          ))}
          {presets.length === 0 && <li className="text-muted-foreground">Пресетов нет.</li>}
        </ul>
        <form className="flex gap-2" onSubmit={(event) => {
          event.preventDefault();
          void createPreset(presetName.trim()).then(() => {
            setPresetName('');
            setMessage('Пресет создан');
            load();
          }).catch((err: unknown) => setError(errorText(err)));
        }}>
          <input id="preset-name" name="name" value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder="Имя пресета" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg border border-border px-3 py-2 text-sm">Создать</button>
        </form>
      </PanelCard>
    </div>
  );
};

export default AdminChatDeskPage;
