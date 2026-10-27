import React, { useEffect, useState } from 'react';
import { bannerText, listBanners, type AppBanner } from '../../services/chatDeskService';

const ChatBanners: React.FC = () => {
  const [banners, setBanners] = useState<AppBanner[]>([]);

  useEffect(() => {
    let cancelled = false;
    void listBanners()
      .then((rows) => {
        if (!cancelled) setBanners(rows.filter((row) => bannerText(row)));
      })
      .catch(() => {
        if (!cancelled) setBanners([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (banners.length === 0) return null;
  return (
    <div className="shrink-0 space-y-1 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2">
      {banners.map((banner, index) => (
        <p key={banner.id || index} className="text-sm text-amber-950 dark:text-amber-100">
          {bannerText(banner)}
        </p>
      ))}
    </div>
  );
};

export default ChatBanners;
