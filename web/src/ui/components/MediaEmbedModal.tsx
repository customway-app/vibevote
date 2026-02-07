import { useEffect } from 'react';

function youtubeEmbedUrl(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');

    let id = '';
    if (host === 'youtu.be') {
      id = u.pathname.split('/').filter(Boolean)[0] || '';
    } else if (host.endsWith('youtube.com')) {
      if (u.pathname === '/watch') id = u.searchParams.get('v') || '';
      else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2] || '';
      else if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2] || '';
    }
    if (!id) return null;
    return `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1`;
  } catch {
    return null;
  }
}

function spotifyEmbedUrl(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (!host.endsWith('spotify.com')) return null;

    const parts = u.pathname.split('/').filter(Boolean);
    // /track/:id, /album/:id, /playlist/:id, /episode/:id, /show/:id
    if (parts.length < 2) return null;
    const type = parts[0];
    const id = parts[1];
    return `https://open.spotify.com/embed/${encodeURIComponent(type)}/${encodeURIComponent(id)}`;
  } catch {
    return null;
  }
}

export default function MediaEmbedModal(props: {
  open: boolean;
  kind: 'youtube' | 'spotify';
  url: string;
  title: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!props.open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') props.onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [props.open, props.onClose]);

  if (!props.open) return null;

  const embedUrl = props.kind === 'youtube' ? youtubeEmbedUrl(props.url) : spotifyEmbedUrl(props.url);

  return (
    <>
      <div className="vote-success-modal visible" role="dialog" aria-modal="true" aria-label={props.title}>
        <div className="modal-content media-modal-content">
          <div className="media-modal-header">
            <div className="media-modal-title">{props.title}</div>
            <button type="button" className="media-modal-close" onClick={props.onClose} aria-label="Close">
              x
            </button>
          </div>
          <div className="media-modal-body">
            {embedUrl ? (
              <iframe
                className={props.kind === 'spotify' ? 'media-embed media-embed-spotify' : 'media-embed'}
                src={embedUrl}
                title={props.title}
                loading="lazy"
                allow={props.kind === 'youtube' ? 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' : 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'}
                allowFullScreen
              />
            ) : (
              <div className="text-sm text-white/70">Invalid media URL.</div>
            )}
          </div>
        </div>
      </div>
      <div className="vote-modal-backdrop visible" onClick={props.onClose} />
    </>
  );
}
