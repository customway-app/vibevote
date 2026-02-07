import { useEffect, useMemo, useState } from 'react';

type GroupKey = 'all' | '0-9' | 'a-f' | 'g-l' | 'm-r' | 's-z';

function groupFor(name: string): GroupKey {
  const c = (name.trim()[0] || '').toLowerCase();
  if (!c) return 'all';
  if (c >= '0' && c <= '9') return '0-9';
  if (c >= 'a' && c <= 'f') return 'a-f';
  if (c >= 'g' && c <= 'l') return 'g-l';
  if (c >= 'm' && c <= 'r') return 'm-r';
  if (c >= 's' && c <= 'z') return 's-z';
  return 'all';
}

export default function GenrePickerModal(props: {
  open: boolean;
  genres: string[];
  selected?: string;
  clearOptionLabel?: string;
  clearOptionValue?: string;
  onSelect: (genre: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<GroupKey>('all');

  useEffect(() => {
    if (!props.open) return;
    setQuery('');
    setGroup('all');
  }, [props.open]);

  useEffect(() => {
    if (!props.open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') props.onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [props.open, props.onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return props.genres
      .filter((g) => {
        if (props.clearOptionValue && g === props.clearOptionValue) return true;
        if (group !== 'all' && groupFor(g) !== group) return false;
        if (!q) return true;
        return g.toLowerCase().includes(q);
      })
      .slice(0, 500);
  }, [props.genres, query, group, props.clearOptionValue]);

  if (!props.open) return null;

  return (
    <>
      <div className="vote-success-modal visible" role="dialog" aria-modal="true" aria-label="Choose genre">
        <div className="modal-content media-modal-content">
          <div className="media-modal-header">
            <div className="media-modal-title">Choose a genre</div>
            <button type="button" className="media-modal-close" onClick={props.onClose} aria-label="Close">
              x
            </button>
          </div>

          <div className="media-modal-body">
            <input
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search genres..."
              autoFocus
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={group === 'all' ? 'btn btn-primary h-9 px-3 text-xs' : 'btn btn-ghost h-9 px-3 text-xs'} onClick={() => setGroup('all')}>
                All
              </button>
              <button type="button" className={group === '0-9' ? 'btn btn-primary h-9 px-3 text-xs' : 'btn btn-ghost h-9 px-3 text-xs'} onClick={() => setGroup('0-9')}>
                0-9
              </button>
              <button type="button" className={group === 'a-f' ? 'btn btn-primary h-9 px-3 text-xs' : 'btn btn-ghost h-9 px-3 text-xs'} onClick={() => setGroup('a-f')}>
                A-F
              </button>
              <button type="button" className={group === 'g-l' ? 'btn btn-primary h-9 px-3 text-xs' : 'btn btn-ghost h-9 px-3 text-xs'} onClick={() => setGroup('g-l')}>
                G-L
              </button>
              <button type="button" className={group === 'm-r' ? 'btn btn-primary h-9 px-3 text-xs' : 'btn btn-ghost h-9 px-3 text-xs'} onClick={() => setGroup('m-r')}>
                M-R
              </button>
              <button type="button" className={group === 's-z' ? 'btn btn-primary h-9 px-3 text-xs' : 'btn btn-ghost h-9 px-3 text-xs'} onClick={() => setGroup('s-z')}>
                S-Z
              </button>
            </div>

            <div className="mt-3 max-h-[55vh] overflow-auto rounded-xl ring-1 ring-white/10">
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-sm text-white/60">No matches.</div>
              ) : (
                filtered.map((g) => {
                  const selected = (props.selected || '') === g;
                  const isClear = Boolean(props.clearOptionValue) && g === props.clearOptionValue;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => props.onSelect(g)}
                      className={
                        selected
                          ? 'flex w-full items-center justify-between px-4 py-3 text-left text-sm text-white bg-emerald-500/20'
                          : 'flex w-full items-center justify-between px-4 py-3 text-left text-sm text-white/90 hover:bg-white/5'
                      }
                    >
                      <span>{isClear ? (props.clearOptionLabel || g) : g}</span>
                      {selected ? <span className="text-xs text-emerald-200">Selected</span> : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="vote-modal-backdrop visible" onClick={props.onClose} />
    </>
  );
}
