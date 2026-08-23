# ブラウザとレンダリング

現在の`remotion-presets`は、effects系を共有Canvas 2Dエンジン、transition系を14種類の共有DOM presentation、文字・ルック・要素アニメーションを共有DOM/CSSエンジンで描画します。個々のIDはengineやvariantによって共有処理の見た目を切り替えます。

`getPresetMetadata(id).renderMode`の`dom`／`canvas2d`／`webgl`は、各プリセットが目標とする処理特性と将来の専用実装を分類するメタデータです。現在の物理バックエンドを示す値ではなく、`webgl`と記載された項目も現行版がWebGL shaderを実行するという意味ではありません。

## `Video`／`Img`のEffectsにはChromeフラグ不要

`createPresetEffect()`または`usePresetEffect()`が返す`effects`は、Remotionのeffects対応コンポーネントへ渡します。通常の用途は`@remotion/media`の`Video`と、`remotion`の`Img`です。

```tsx
import { Video } from '@remotion/media';
import { usePresetEffect } from 'remotion-presets/effects';

export const Shot: React.FC<{ src: string }> = ({ src }) => {
  const preset = usePresetEffect('camera-shake', {
    intensity: 0.7,
    seed: 'shot-a',
  });

  return <Video src={src} effects={[...preset.effects]} />;
};
```

`Video`や`Img`へeffectsを適用する一般的な使い方には、HTML-in-canvasの実験的なChromeフラグは不要です。Chrome 149以降という条件も、この使い方には当てはまりません。

複数のプリセットは、適用したい順番で同じ`effects`配列へ連結できます。

```tsx
import { Video } from '@remotion/media';
import { createPresetEffect, usePresetEffect } from 'remotion-presets/effects';

export const LayeredEffects: React.FC<{ src: string }> = ({ src }) => {
  const grain = usePresetEffect('noise', { intensity: 0.25, seed: 'grain' });
  const edge = createPresetEffect('vignette', { intensity: 0.65 });

  return <Video src={src} effects={[...grain.effects, ...edge.effects]} />;
};
```

## 静的effectと時間変化するeffect

`createPresetEffect()`はRemotionコンポーネントの外でも呼べる静的factoryです。frame 0、30fpsのdescriptorを作るため、ビネット、色調、固定モザイクなど、時間変化を必要としないルックに適しています。

`usePresetEffect()`はRemotionコンポーネント内で使うhookです。`useCurrentFrame()`と`useVideoConfig()`から現在frameとfpsを取り込みます。camera shake、noise、VHS、light leaks、timecodeなど、時間とともに変化するプリセットにはこちらを使ってください。

どちらも`seed`を固定すれば、同じframe、fps、入力、optionsから決定的な結果を得られます。

## `HtmlInCanvas`を使う場合だけ必要な条件

`HtmlInCanvas`は、通常のReact DOMを`<canvas>`へ描画してから、Canvas 2D、WebGL、WebGPUの後処理を加えるための実験的なRemotion APIです。`div`や複雑なReactシーンなど、もともとeffects対応CanvasではないDOMへプリセットeffectを適用したい場合に使います。

通常のChromeで`HtmlInCanvas`をStudioプレビューする場合、2026年8月24日時点のRemotion公式要件は次のとおりです。

1. Google Chrome 149以降を使用する。
2. `chrome://flags/#canvas-draw-element`を開く。
3. `HTML-in-Canvas`を`Enabled`にしてChromeを再起動する。

実行時の対応有無はRemotionの`isHtmlInCanvasSupported()`で確認できます。この制約は`HtmlInCanvas`でDOMをCanvas化する場合だけのもので、前述の`Video`／`Img` Effectsには適用されません。

要件はブラウザ側の実装に合わせて変わる可能性があります。最新情報は[Remotion公式のHTML-in-canvasドキュメント](https://www.remotion.dev/docs/html-in-canvas)を優先してください。

## Studioカタログでの違い

同梱Studioのcompositionは、確認する描画経路が異なります。

- `PresetCatalog`、`PresetContactSheet`、`PresetSingle`: 共有DOM/CSSレイヤーまたはDOM transitionのカタログ表示。HTML-in-canvasフラグは不要
- `CanvasEffectSingle`: 任意のDOMシーンを`HtmlInCanvas`でCanvas化し、effects APIの実処理を確認。通常Chromeでのプレビューには前述のChrome 149以降とフラグが必要

`CanvasEffectSingle`のInput Propsに`api: 'effects'`の`presetId`を指定してください。未知のIDやcomponent／presentation用IDを指定すると、利用できない理由をcomposition内に表示します。

## CLI／サーバーで`HtmlInCanvas`をレンダーする

Remotion `4.0.455`以降のCLI、サーバーサイドレンダリング、Lambda、Vercelでは、HTML-in-canvas対応を有効化したRemotion同梱のChromiumが使われます。このリポジトリはRemotion `4.0.515`で検証しています。

現行版の標準プリセットはWebGL shaderを使いません。利用側で独自のWebGL effectを追加する場合は、ANGLEを使う設定が必要になることがあります。

```bash
npx remotion render --gl=angle
```

GPUを利用できない環境ではSoftware ANGLEを選べます。

```bash
npx remotion render --gl=swangle
```

プロジェクト全体の既定値にする場合は、利用側の`remotion.config.ts`で設定します。

```ts
import { Config } from '@remotion/cli/config';

Config.setChromiumOpenGlRenderer('angle');
```

## `HtmlInCanvas`を入れ子にしない

`HtmlInCanvas`の入れ子は、プレビュー、クライアントレンダリング、サーバーレンダリングのすべてで未対応で、エラーになります。複数のeffectは`HtmlInCanvas`を何重にも置かず、1つの`effects`配列へまとめてください。

```tsx
import { HtmlInCanvas, useVideoConfig } from 'remotion';
import { createPresetEffect, usePresetEffect } from 'remotion-presets/effects';

export const ProcessedDomScene: React.FC = () => {
  const { width, height, durationInFrames } = useVideoConfig();
  const first = usePresetEffect('rgb-split', { intensity: 0.6 });
  const second = createPresetEffect('vignette', { intensity: 0.5 });

  return (
    <HtmlInCanvas
      width={width}
      height={height}
      durationInFrames={durationInFrames}
      effects={[...first.effects, ...second.effects]}
    >
      <MyDomScene />
    </HtmlInCanvas>
  );
};
```

この入れ子制約も`Video`／`Img`へeffects配列を渡すだけの使い方には関係しません。

## Premiere参照プリセットの再現度

v0.1.0のPremiere参照204件は、共有engine／familyによる利用可能な近似です。すべて`getPresetMetadata(id).premiereReferences[].fidelity === 'approximate'`として公開します。Premiereとの画素単位の一致や内部アルゴリズムの同一性は保証しません。

特に次の項目は、映像内容の解析、Adobe固有の色空間、トラッキング、360度投影などにより差分が大きくなります。

- Morph Cut、Auto Reframe、Warp Stabilizerなどの解析依存処理
- VR／Immersive Videoの投影と継ぎ目処理
- Adobe固有の合成式、ブラー、カラー処理
- Legacy項目の古いGPU／ピクセル処理

詳細は[Premiere対応表](premiere-coverage.md)を参照してください。

## 問題を切り分ける

1. `getPresetMetadata(id).api`を確認する。
2. `Video`／`Img` EffectsならHTML-in-canvasフラグは不要。Remotionパッケージのバージョンとeffectの入力を確認する。
3. `HtmlInCanvas`ならChromeのバージョン、フラグ、入れ子の有無を確認する。
4. 時間変化するeffectなら`createPresetEffect()`ではなく`usePresetEffect()`を使う。
5. `seed`を固定し、同じframeとfpsで比較する。
6. Premiere参照項目はすべて近似であることを前提に、対応表とStudioの`CanvasEffectSingle`で確認する。
