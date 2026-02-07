import { useEffect } from 'react';

export default function VoteSuccessModal(props: {
  open: boolean;
  variant?: 'success' | 'notice';
  title?: string;
  message: string;
  buttonText?: string;
  accentColor?: string;
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

  const variant = props.variant || 'success';
  const accent = props.accentColor || (variant === 'notice' ? '#EF4444' : '#10B981');
  const title = props.title || (variant === 'notice' ? 'Notice' : 'Success!');
  const buttonText = props.buttonText || (variant === 'notice' ? 'OK' : 'Got it!');

  return (
    <>
      <div
        id="vote-notification-modal"
        className="vote-success-modal visible"
        role="dialog"
        aria-modal="true"
        aria-label={props.title || 'Success'}
      >
        <div className="modal-content">
          <div className="modal-header">
            <div className="success-icon" aria-hidden="true">
              {variant === 'notice' ? (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke={accent} strokeWidth="2" fill="none" />
                  <path d="M12 8V12" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 16H12.01" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 9L9 15" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke={accent} strokeWidth="2" fill="none" />
                  <path d="M9 12L11 14L15 10" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <h3 className="modal-title">{title}</h3>
          </div>
          <div className="modal-body">
            <p className="modal-message">{props.message}</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="close-button" onClick={props.onClose} style={{ background: accent }}>
              {buttonText}
            </button>
          </div>
        </div>
      </div>

      <div id="vote-notification-backdrop" className="vote-modal-backdrop visible" onClick={props.onClose} />
    </>
  );
}
