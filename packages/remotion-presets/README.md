# remotion-presets

Remotionで「タイプライター」「黄金の文字」「画面外から登場」「ウィップ」といった編集意図を指定する、高レベル映像プリセットライブラリです。

- Premiere Pro 26.0 Currentを参照した171件
- Premiere Pro Legacyを参照した33件
- 文字、登場演出、ルック、編集演出の独自複合プリセット24件
- 合計228件
- Remotion `4.0.515`で検証
- ESM、CommonJS、TypeScript型定義、subpath export対応

v0.1.0のPremiere参照204件は、共有engine／familyで編集意図を利用可能にした`approximate`実装です。専用アルゴリズムと視覚検証がそろった項目だけを、今後`equivalent`へ昇格します。段階ごとの完了条件は[ロードマップ](https://github.com/LilMzki/remotion-presets/blob/main/docs/roadmap.md)で公開しています。

> 現在はnpm未公開です。GitHubリポジトリをcloneし、workspaceからtarballを作って導入してください。詳細は[リポジトリの導入ガイド](https://github.com/LilMzki/remotion-presets/blob/main/docs/getting-started.md)を参照してください。

## 導入

```bash
git clone https://github.com/LilMzki/remotion-presets.git
cd remotion-presets
npm ci
npm run build
npm pack --workspace remotion-presets
```

利用側のRemotionプロジェクトで、生成したファイルと同じバージョンのRemotion依存を追加します。

```bash
npm install /absolute/path/to/remotion-presets/remotion-presets-0.1.0.tgz
npm install --save-exact remotion@4.0.515 @remotion/transitions@4.0.515
# <Video>へeffectを渡す例を使う場合
npm install --save-exact @remotion/media@4.0.515
```

peer dependencyは`remotion`／`@remotion/transitions`の`4.0.515`、React／React DOM `>=18 <20`です。利用側の`@remotion/*`も`4.0.515`にそろえてください。

## コンポーネント

```tsx
import { GoldenText, TypewriterText } from 'remotion-presets/text';
import { OffscreenSlideIn } from 'remotion-presets/animations';

<TypewriterText
  text="Create in motion."
  durationInFrames={42}
  style={{ fontSize: 80, fontWeight: 700 }}
/>;

<GoldenText text="GOLDEN" intensity={1.1} style={{ fontSize: 112 }} />;

<OffscreenSlideIn direction="left" durationInFrames={24}>
  <MyTitle />
</OffscreenSlideIn>;
```

## エフェクト

```tsx
import { Video } from '@remotion/media';
import { usePresetEffect } from 'remotion-presets/effects';

const Shot: React.FC<{ src: string }> = ({ src }) => {
  const vintage = usePresetEffect('vintage-film', {
    intensity: 0.8,
    seed: 'scene-07',
  });

  return <Video src={src} effects={[...vintage.effects]} style={vintage.fallbackStyle} />;
};
```

camera shake、noise、VHS、vintage filmなど時間変化する演出には`usePresetEffect()`を使います。ビネットや固定色調などの静的ルックは、コンポーネント外でも呼べる`createPresetEffect()`で作れます。

## トランジション

```tsx
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { createPresetTransition, createTransitionSpec } from 'remotion-presets/transitions';

<TransitionSeries.Transition
  presentation={createPresetTransition('whip', { direction: 'left' })}
  timing={linearTiming({ durationInFrames: 18 })}
/>;
```

presentationとtimingをまとめて作る場合は`createTransitionSpec()`を使います。

```tsx
const transition = createTransitionSpec('neon-wipe', {
  durationInFrames: 24,
  motion: 'snappy',
});

<TransitionSeries.Transition {...transition} />;
```

## 台帳

```ts
import { getPresetMetadata, presetRegistry, searchPresets } from 'remotion-presets/registry';

console.log(presetRegistry.length); // 228
console.log(getPresetMetadata('golden-text').displayNameJa); // 黄金の文字
console.log(searchPresets('glow'));
```

全ID、Premiereカテゴリ、再現度は[Premiere対応表](https://github.com/LilMzki/remotion-presets/blob/main/docs/premiere-coverage.md)、propsと返り値は[APIガイド](https://github.com/LilMzki/remotion-presets/blob/main/docs/api.md)を参照してください。

## ブラウザ要件

`Video`／`Img` Effectsに特別なChromeフラグは不要です。Chrome 149以降と`chrome://flags/#canvas-draw-element`が必要なのは、任意DOMを実験的な`HtmlInCanvas`でCanvas化してStudioプレビューする場合だけです。詳しくは[ブラウザとレンダリング](https://github.com/LilMzki/remotion-presets/blob/main/docs/browser-and-rendering.md)を参照してください。

## ライセンス

本ライブラリの独自コードはMIT Licenseです。ただし、依存するRemotionと`@remotion/*`にはRemotion独自の利用条件が適用されます。[Remotion License](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)を確認してください。

本プロジェクトはAdobeおよびRemotionの非公式プロジェクトで、各社との提携・承認関係はありません。Adobe製品のコード、プリセットファイル、素材は使用していません。
