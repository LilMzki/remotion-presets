import React from 'react';
import { AbsoluteFill, Series } from 'remotion';
import { presetRegistry } from 'remotion-presets';
import { SampleScene } from './SampleScene';

export const CATALOG_ITEM_DURATION = 90;
export const CONTACT_SHEET_DURATION = 120;
export const SINGLE_PRESET_DURATION = 150;
export const CONTACT_SHEET_PAGE_SIZE = 12;

export type PresetContactSheetProps = {
  readonly page: number;
};

export type PresetSingleProps = {
  readonly presetId: string;
};

const Counter: React.FC<{ readonly index: number; readonly total: number }> = ({
  index,
  total,
}) => (
  <div
    style={{
      position: 'absolute',
      top: 42,
      right: 48,
      zIndex: 10,
      color: 'rgba(255,255,255,.78)',
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      fontSize: 17,
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: '0.08em',
      textShadow: '0 2px 14px #000',
    }}
  >
    {String(index + 1).padStart(3, '0')} / {String(total).padStart(3, '0')}
  </div>
);

export const PresetCatalog: React.FC = () => {
  return (
    <Series>
      {presetRegistry.map((preset, index) => (
        <Series.Sequence key={preset.id} durationInFrames={CATALOG_ITEM_DURATION}>
          <SampleScene presetId={preset.id} />
          <Counter index={index} total={presetRegistry.length} />
        </Series.Sequence>
      ))}
    </Series>
  );
};

const EmptyPage: React.FC<{ readonly page: number; readonly totalPages: number }> = ({
  page,
  totalPages,
}) => (
  <AbsoluteFill
    style={{
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      background: '#080b17',
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    }}
  >
    <div style={{ fontSize: 50, fontWeight: 800 }}>Page is outside the catalog</div>
    <div style={{ marginTop: 16, color: '#94a3b8', fontSize: 23 }}>
      Requested {page + 1}; available pages: {totalPages}
    </div>
  </AbsoluteFill>
);

export const PresetContactSheet: React.FC<PresetContactSheetProps> = ({ page }) => {
  const safePage = Number.isFinite(page) ? Math.max(0, Math.floor(page)) : 0;
  const totalPages = Math.ceil(presetRegistry.length / CONTACT_SHEET_PAGE_SIZE);
  const presets = presetRegistry.slice(
    safePage * CONTACT_SHEET_PAGE_SIZE,
    (safePage + 1) * CONTACT_SHEET_PAGE_SIZE,
  );

  if (presets.length === 0) return <EmptyPage page={safePage} totalPages={totalPages} />;

  return (
    <AbsoluteFill
      style={{
        padding: '38px 44px 44px',
        boxSizing: 'border-box',
        color: 'white',
        background:
          'radial-gradient(circle at 12% 0%, rgba(99,102,241,.25), transparent 33%), #080b17',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          height: 86,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: 34, fontWeight: 820, letterSpacing: '-0.035em' }}>
            Remotion Presets
          </div>
          <div style={{ marginTop: 5, color: '#8994ac', fontSize: 14, letterSpacing: '0.12em' }}>
            VISUAL CONTACT SHEET · {presetRegistry.length} PRESETS
          </div>
        </div>
        <div style={{ fontSize: 18, color: '#aeb7ca', fontVariantNumeric: 'tabular-nums' }}>
          PAGE {safePage + 1} / {totalPages}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gridTemplateRows: 'repeat(3, minmax(0, 1fr))',
          gap: 16,
        }}
      >
        {presets.map((preset, index) => (
          <div
            key={preset.id}
            style={{
              position: 'relative',
              minWidth: 0,
              minHeight: 0,
              overflow: 'hidden',
              borderRadius: 16,
              background: '#11162a',
              border: '1px solid rgba(255,255,255,.1)',
              boxShadow: '0 15px 35px rgba(0,0,0,.28)',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, bottom: 48 }}>
              <SampleScene presetId={preset.id} compact showDetails={false} />
            </div>
            <div
              style={{
                position: 'absolute',
                left: 15,
                right: 15,
                bottom: 11,
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div
                style={{
                  minWidth: 0,
                  overflow: 'hidden',
                  color: '#f8fafc',
                  fontSize: 15,
                  fontWeight: 720,
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {preset.displayName}
              </div>
              <div
                style={{
                  flex: 'none',
                  color: '#6f7a92',
                  fontSize: 11,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {String(safePage * CONTACT_SHEET_PAGE_SIZE + index + 1).padStart(3, '0')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const PresetSingle: React.FC<PresetSingleProps> = ({ presetId }) => (
  <SampleScene presetId={presetId} />
);
