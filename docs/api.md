# APIガイド

`remotion-presets`は、同じプリセット台帳を3種類の高レベルAPIから利用できるように設計されています。

1. 文字・登場演出はReactコンポーネント
2. 映像処理はRemotionの`effects`配列
3. カット間の演出は`TransitionSeries`互換presentation

プリセットの調整には、座標列や生のキーフレームではなく、強さ、方向、長さ、色、seedといった意味のある値を使います。

## 共通オプション

`PresetOptions`は多くのAPIで共通です。プリセットが使わない値は無視されることがあります。各プリセットが公開する調整項目と既定値は`getPresetMetadata(id).controls`で確認できます。

| prop               | 型                                             | 意味                                          |
| ------------------ | ---------------------------------------------- | --------------------------------------------- |
| `intensity`        | `number`                                       | 演出の強さ。標準値は`1`。通常は`0`〜`2`を想定 |
| `seed`             | `string \| number`                             | ノイズ、揺れ、出現順などを固定するseed        |
| `durationInFrames` | `number`                                       | アニメーションが完了するまでのフレーム数      |
| `color`            | `string`                                       | 主色。hex、対応named、`rgb[a]()`、`hsl[a]()`  |
| `secondaryColor`   | `string`                                       | 補助色。同じ安全な色構文を使用                |
| `direction`        | `'left' \| 'right' \| 'top' \| 'bottom'`       | 移動・ワイプの方向                            |
| `motion`           | `'gentle' \| 'smooth' \| 'snappy' \| 'bouncy'` | `createTransitionSpec()`が選ぶtimingの性格    |

componentとtransition presentationは、Remotionの現在frameとcomposition設定から描画状態を求めます。effectは呼び出し方が2つあり、`createPresetEffect()`はframe 0／30fpsの静的descriptor、`usePresetEffect()`は現在frame／compositionのfpsを取り込むdescriptorを返します。同じ入力、frame、解像度、fps、seedから同じ結果を得られることを前提にしています。

## 文字プリセット

### `TypewriterText`

文字をgrapheme単位で順番に表示し、末尾へカーソルを点滅させます。絵文字や結合文字は、実行環境が`Intl.Segmenter`を提供する場合に1文字として扱います。

```tsx
import { TypewriterText } from 'remotion-presets/text';

<TypewriterText
  text="こんにちは、Remotion。"
  durationInFrames={50}
  intensity={1}
  style={{ fontSize: 72, fontWeight: 700 }}
/>;
```

### `GoldenText`

金属的なグラデーション、ハイライト、奥行きのある影をまとめた複合文字プリセットです。

```tsx
import { GoldenText } from 'remotion-presets/text';

<GoldenText
  text="GOLDEN"
  color="#ffd66b"
  secondaryColor="#7c4300"
  intensity={1.2}
  style={{ fontSize: 120, fontWeight: 900 }}
/>;
```

`TypewriterText`と`GoldenText`のpropsは共通です。

```ts
type TextPresetProps = PresetOptions & {
  text: string;
  className?: string;
  style?: React.CSSProperties;
};
```

このほか`NeonText`、`ChromeText`、`GlassText`、`KineticWordCascade`、`ScrambleRevealText`を名前付きexportで提供します。任意の文字プリセットIDを動的に選ぶ場合は`PresetText`を使います。

```tsx
import { PresetText } from 'remotion-presets/text';

<PresetText preset="scramble-reveal-text" text="SYSTEM READY" seed="title-a" />;
```

`createTextComponent(id)`は文字プリセットIDを固定したコンポーネントを返します。`textPresets`は、登録済み文字プリセットをIDから引ける読み取り専用Recordです。

## 登場・要素アニメーション

### `OffscreenSlideIn`

子要素を指定方向の画面外から所定位置へ運びます。動きの数値を直接組む必要はありません。

```tsx
import { OffscreenSlideIn } from 'remotion-presets/animations';

<OffscreenSlideIn direction="bottom" durationInFrames={28} intensity={0.85}>
  <img src={staticFile('product.png')} style={{ width: 800 }} />
</OffscreenSlideIn>;
```

```ts
type AnimationPresetProps = PresetOptions & {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};
```

名前付きexportは`SpringMotion`、`OffscreenSlideIn`、`ElasticPopIn`、`BlurRiseIn`、`MaskedReveal`、`CinematicZoomIn`、`PaperFoldIn`です。`createAnimationComponent(id)`でIDを固定したコンポーネントを作れます。`animationPresets`から登録済みanimationを動的に選ぶこともできます。

## レイヤー／ルック

`PresetLayer`は、React要素へ任意の登録プリセットのDOM/CSSレイヤー表現を適用する汎用コンポーネントです。Canvas Effectsの代わりではなく、子要素ごと包んで動きや簡易ルックを付けたい場合に使います。

```tsx
import { PresetLayer } from 'remotion-presets/effects';

<PresetLayer preset="camera-shake" intensity={0.6} seed="impact-2">
  <MyScene />
</PresetLayer>;
```

`VintageFilm`、`TealOrangeCinema`、`Noir`、`BleachBypass`、`DreamGlow`、`Vhs`は、よく使う複合映像ルックを`PresetLayer`として利用できる名前付きexportです。

```tsx
import { VintageFilm } from 'remotion-presets/looks';

<VintageFilm intensity={0.75} seed="archive-clip">
  <MyScene />
</VintageFilm>;
```

## 映像エフェクト

### `createPresetEffect(presetId, options?)` — 静的

登録済みのeffects系プリセットから、frame 0／30fpsの静的な`PresetEffect`を作ります。Remotionコンポーネントの外でも呼べるため、ビネット、固定色調、固定モザイクなど時間変化を必要としないルックに適しています。

```ts
interface PresetEffect {
  presetId: string;
  effects: readonly EffectDescriptor<unknown>[];
  fallbackStyle: React.CSSProperties;
}
```

`effects`はRemotionのeffects対応コンポーネントへ渡し、`fallbackStyle`はCSSで表現できる部分を同じ要素の`style`へマージします。

```tsx
import { Video } from '@remotion/media';
import { createPresetEffect } from 'remotion-presets/effects';

export const ProcessedVideo: React.FC<{ src: string }> = ({ src }) => {
  const preset = createPresetEffect('vignette', { intensity: 0.7 });

  return (
    <Video
      src={src}
      effects={[...preset.effects]}
      style={{ width: '100%', height: '100%', ...preset.fallbackStyle }}
    />
  );
};
```

### `usePresetEffect(presetId, options?)` — frame-aware hook

Remotionコンポーネント内で現在frameとfpsを取り込むhookです。camera shake、noise、VHS、light leaks、vintage film、timecodeなど、時間とともに変わるプリセットにはこちらを推奨します。

```tsx
import { Video } from '@remotion/media';
import { usePresetEffect } from 'remotion-presets/effects';

export const AnimatedEffectVideo: React.FC<{ src: string }> = ({ src }) => {
  const preset = usePresetEffect('camera-shake', {
    intensity: 0.65,
    seed: 'camera-b',
  });

  return <Video src={src} effects={[...preset.effects]} />;
};
```

通常のReact hookと同じく、条件分岐やループの中では呼ばないでください。時間変化する複数のeffectを組み合わせる場合は、それぞれをcomponent直下で呼び、返された配列を連結します。

複数のfactoryを呼ぶ場合は、`effects`を適用したい順番で連結してください。Remotion Effectsは配列の先頭から順に処理されます。

```tsx
import { Video } from '@remotion/media';
import { createPresetEffect, usePresetEffect } from 'remotion-presets/effects';

export const LayeredEffects: React.FC<{ src: string }> = ({ src }) => {
  const grain = usePresetEffect('noise', { intensity: 0.25, seed: 'grain' });
  const edge = createPresetEffect('vignette', { intensity: 0.65 });

  return (
    <Video
      src={src}
      effects={[...grain.effects, ...edge.effects]}
      style={{ ...grain.fallbackStyle, ...edge.fallbackStyle }}
    />
  );
};
```

`effectPresets[id](options)`は静的な`createPresetEffect(id, options)`のRecord形式です。ルックの`vintageFilmEffect`、`tealOrangeCinemaEffect`、`noirEffect`、`bleachBypassEffect`、`dreamGlowEffect`、`vhsEffect`も静的factoryです。時間変化が必要なら、IDを`usePresetEffect()`へ渡してください。

`createPresetEffect()`はeffects APIに対応するIDだけを受け付けます。未知のID、component／presentation用IDを渡すと`RangeError`になります。`intensity`は0〜2、`durationInFrames`は1以上の整数、`seed`は文字列または有限数、`direction`は4方向のいずれかです。色はhex、ライブラリが対応するnamed color、`rgb()`／`rgba()`、`hsl()`／`hsla()`の安全なsubsetを受け付けます。`var()`、`url()`、`oklch()`など、それ以外のCSS色構文はv0.1では拒否します。不正な値は`TypeError`または`RangeError`になります。

> [!NOTE]
> `fallbackStyle`はCanvas処理の完全な代替ではありません。effectsを使わずDOM/CSSだけで簡易表示したい場合に、可能な範囲の色・透明度・変形を示します。`Video`／`Img`へeffectsを渡す通常の使い方にHTML-in-canvasのChromeフラグは不要です。

## トランジション

### `createPresetTransition(presetId, options?)`

`TransitionSeries.Transition`の`presentation`へ直接渡せる値を返します。トランジションの長さはpresentationではなく`timing`で決めます。

```tsx
import { springTiming, TransitionSeries } from '@remotion/transitions';
import { createPresetTransition } from 'remotion-presets/transitions';

const presentation = createPresetTransition('neon-wipe', {
  direction: 'right',
  color: '#22d3ee',
  secondaryColor: '#e879f9',
  intensity: 1.1,
});

<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={100}>
    <Before />
  </TransitionSeries.Sequence>
  <TransitionSeries.Transition
    presentation={presentation}
    timing={springTiming({ durationInFrames: 24 })}
  />
  <TransitionSeries.Sequence durationInFrames={100}>
    <After />
  </TransitionSeries.Sequence>
</TransitionSeries>;
```

### `createTransitionSpec(presetId, options?)`

presentationに加えて`timing`も高レベルに選びたい場合は、`createTransitionSpec()`を使います。`durationInFrames`と`motion`から`linearTiming()`または`springTiming()`を組み、`{presentation, timing}`を返します。

```tsx
import { TransitionSeries } from '@remotion/transitions';
import { createTransitionSpec } from 'remotion-presets/transitions';

const transition = createTransitionSpec('whip', {
  direction: 'left',
  durationInFrames: 18,
  motion: 'snappy',
});

<TransitionSeries.Transition presentation={transition.presentation} timing={transition.timing} />;
```

`motion`は次のように解釈されます。

- `gentle`: sine系の穏やかなlinear timing
- `smooth`: cubic系の滑らかなlinear timing（通常の既定値）
- `snappy`: 減衰を強めた素早いspring timing
- `bouncy`: オーバーシュートを感じるspring timing（spring系プリセットの既定値）

よく使う`crossDissolve`、`whip`、`burnAlpha`、`neonWipe`、`glitchCut`、`filmBurnCut`、`lightLeakCut`、`whipPanCut`は、同じ`{presentation, timing}`を返す名前付きfactoryです。すべての登録済みtransitionは`transitionPresets[id](options)`からも同じ形式で作れます。presentationだけが必要なときは`createPresetTransition()`を使ってください。

## プリセット台帳

台帳は実行時の選択UI、検索、ドキュメント生成に利用できます。

```tsx
import {
  getPresetMetadata,
  getPresetsByKind,
  isPresetId,
  createPreset,
  presetRegistry,
  registryStats,
  searchPresets,
  type PresetId,
} from 'remotion-presets/registry';

const all = presetRegistry; // 228件
const transitions = getPresetsByKind('transition');
const glowing = searchPresets('glow');
const metadata = getPresetMetadata('golden-text');
const saved = createPreset('vintage-film', { intensity: 0.8, seed: 'shot-a' });
// {schemaVersion: 1, id: 'vintage-film', options: {...}}

const fromInput = 'whip';
if (isPresetId(fromInput)) {
  const id: PresetId = fromInput;
  console.log(getPresetMetadata(id));
}

console.log(registryStats);
// {
//   total: 228,
//   currentPremiereReferences: 171,
//   legacyPremiereReferences: 33,
//   compound: 24
// }
```

各`PresetDefinition`には次の情報があります。

- 安定ID、export名、日英表示名、日本語説明
- `kind`（`effect`、`transition`、`animation`、`text`、`look`、`overlay`）
- API形式、描画engine、`dom`／`canvas2d`／`webgl`のrender mode
- 既定の長さ、タグ、調整項目と範囲
- Premiere 26.0での名称、カテゴリ、Current／Legacy、`equivalent`／`approximate`
- 独自の複合プリセットかどうか

v0.1.0ではPremiere参照204件がすべて`approximate`です。`equivalent`は、将来専用アルゴリズムと視覚検証がそろった項目へ付与するために予約されています。

`getPresetDefinition()`と別名の`getPresetMetadata()`は、未知のIDに対して候補を含む`RangeError`を投げます。ユーザー入力を受ける場合は先に`isPresetId()`で検証してください。

`createPreset()`は、プリセットの選択を保存・受け渡しやすい読み取り専用の`PresetInstance`にします。`schemaVersion: 1`、型付きID、optionsだけを含むためJSONへシリアライズできます。これは描画結果ではないので、利用時にIDの種類に合わせてcomponent、静的な`createPresetEffect()`、時間変化する`usePresetEffect()`、`createPresetTransition()`のいずれかへ渡します。

## subpath export

```ts
import {...} from 'remotion-presets';
import {...} from 'remotion-presets/animations';
import {...} from 'remotion-presets/effects';
import {...} from 'remotion-presets/looks';
import {...} from 'remotion-presets/registry';
import {...} from 'remotion-presets/text';
import {...} from 'remotion-presets/transitions';
```

ルートexportはすべてのカテゴリを再exportします。subpathはアプリ側のimport意図を明確にするために使えます。ただし各subpathも実行時の`presetRegistry`を参照するため、カテゴリ外の台帳データが必ずバンドルから除外されるという保証はありません。

ルートとsubpathは独立した配布entryとして生成されます。同じプロセスで両方から同じ名前をimportしても、関数やコンポーネントの参照同一性は保証しません。1つのファイルでは、ルートまたは目的別subpathのどちらかへimport元を統一してください。ID、props、返り値の契約は同じです。
