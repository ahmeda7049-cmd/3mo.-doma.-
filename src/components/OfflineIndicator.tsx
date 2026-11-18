import { WifiOff } from 'lucide-react';
import { Translations } from '../game/i18n';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  t: Translations;
}

export function OfflineIndicator({ t }: OfflineIndicatorProps) {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed bottom-3 start-3 z-40 flex items-center gap-2 rounded-lg bg-[#0D1420]/95 border border-amber-400/40 px-3 py-1.5 text-xs font-medium text-amber-300 shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>{t.offlineMessage}</span>
    </div>
  );
}
