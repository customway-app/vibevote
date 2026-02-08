import { useEffect } from 'react';

type ShareTarget = {
  title: string;
  text: string;
  url: string;
};

function tryCopy(text: string) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback for older browsers.
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.left = '-9999px';
  el.style.top = '-9999px';
  document.body.appendChild(el);
  el.focus();
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
  return Promise.resolve();
}

export default function ShareModal(props: {
  open: boolean;
  target: ShareTarget | null;
  onClose: () => void;
  onCopied?: () => void;
}) {
  useEffect(() => {
    if (!props.open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') props.onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [props.open, props.onClose]);

  if (!props.open || !props.target) return null;

  const t = props.target;
  const encodedText = encodeURIComponent(`${t.text} ${t.url}`.trim());
  const encodedUrl = encodeURIComponent(t.url);
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(t.text)}&url=${encodedUrl}`;
  const waUrl = `https://wa.me/?text=${encodedText}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent(t.title)}&body=${encodedText}`;

  return (
    <>
      <div className="vote-success-modal visible" role="dialog" aria-modal="true" aria-label="Share">
        <div className="modal-content">
          <div className="modal-header">
            <div className="success-icon" aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="#A78BFA" strokeWidth="2" fill="none" />
                <path
                  d="M15 8a3 3 0 1 0-2.83-4H12a3 3 0 0 0 0 6c.74 0 1.41-.27 1.92-.72l4.02 2.01a3 3 0 0 0 0 1.42l-4.02 2.01A3 3 0 1 0 15 20a3 3 0 0 0-2.83-4H12a3 3 0 0 0 1.92.72l4.02-2.01A3 3 0 1 0 18 10c-.74 0-1.41.27-1.92.72l-4.02-2.01A2.99 2.99 0 0 0 15 8Z"
                  fill="#A78BFA"
                />
              </svg>
            </div>
            <h3 className="modal-title">Share</h3>
          </div>

          <div className="modal-body">
            <p className="modal-message">{t.text}</p>

            <div className="mt-4 grid gap-3">
              <div className="glass rounded-2xl p-3">
                <div className="flex items-center gap-2">
                  <input readOnly value={t.url} className="input h-10" aria-label="Share link" />
                  <button
                    type="button"
                    className="btn btn-primary h-10 px-4 text-sm"
                    onClick={async () => {
                      await tryCopy(t.url);
                      props.onCopied?.();
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  type="button"
                  className="btn btn-ghost h-10 px-3 text-sm"
                  onClick={async () => {
                    if ((navigator as any).share) {
                      try {
                        await (navigator as any).share({ title: t.title, text: t.text, url: t.url });
                        props.onClose();
                        return;
                      } catch {
                        // User cancelled or share not available.
                      }
                    }
                    window.open(xUrl, '_blank', 'noopener,noreferrer');
                  }}
                >
                  Share…
                </button>

                <a className="btn btn-ghost h-10 px-3 text-center text-sm" href={waUrl} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
                <a className="btn btn-ghost h-10 px-3 text-center text-sm" href={fbUrl} target="_blank" rel="noreferrer">
                  Facebook
                </a>
                <a className="btn btn-ghost h-10 px-3 text-center text-sm" href={xUrl} target="_blank" rel="noreferrer">
                  X
                </a>
                <a className="btn btn-ghost h-10 px-3 text-center text-sm sm:col-span-2" href={mailUrl}>
                  Email
                </a>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="close-button" onClick={props.onClose} style={{ background: '#8B5CF6' }}>
              Close
            </button>
          </div>
        </div>
      </div>
      <div className="vote-modal-backdrop visible" onClick={props.onClose} />
    </>
  );
}
