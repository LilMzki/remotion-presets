# はじめに

このガイドでは、GitHubから`remotion-presets`を導入し、Remotion `4.0.515`のプロジェクトで最初のプリセットを表示するまでを説明します。

## 1. 前提環境

- Node.js 20.17以上
- npm 10以上（このリポジトリのlockfileはnpm 11で作成）
- Remotion `4.0.515`
- React 18または19

Remotionのパッケージはバージョンをまたいだ組み合わせを避け、`remotion`、`@remotion/cli`、`@remotion/media`、`@remotion/transitions`などを同じバージョンにそろえてください。このリポジトリは`4.0.515`でビルドとテストを行っています。

## 2. GitHubからパッケージを作る

`remotion-presets`はまだnpmへ公開されていません。また、リポジトリ直下は複数パッケージをまとめるprivate workspaceであり、そのままGit dependencyとして追加する用途にはなっていません。clone後にライブラリのtarballを生成してください。

```bash
git clone https://github.com/LilMzki/remotion-presets.git
cd remotion-presets
npm ci
npm run build
npm pack --workspace remotion-presets
```

成功すると、リポジトリ直下に`remotion-presets-0.1.0.tgz`が生成されます。

## 3. 利用側へ追加する

利用側のRemotionプロジェクトへ移動し、tarballとpeer dependencyを追加します。パスは実際の保存場所へ置き換えてください。

```bash
npm install /absolute/path/to/remotion-presets/remotion-presets-0.1.0.tgz
npm install --save-exact remotion@4.0.515 @remotion/transitions@4.0.515
```

READMEとAPIガイドの`<Video effects={...}>`例を使う場合は、映像コンポーネントも追加します。

```bash
npm install --save-exact @remotion/media@4.0.515
```

ReactとReact DOMがまだない場合は、利用するRemotionプロジェクトと同じメジャーバージョンで追加します。

```bash
npm install react@19 react-dom@19
```

ローカルで継続的にライブラリを編集する場合は、利用側の`package.json`からtarballを参照すると更新手順が明確になります。

```json
{
  "dependencies": {
    "remotion-presets": "file:../remotion-presets/remotion-presets-0.1.0.tgz"
  }
}
```

ライブラリを変更した後は、再度`npm run build`と`npm pack --workspace remotion-presets`を実行し、利用側で`npm install`し直してください。

## 4. 最初のcomposition

```tsx
import { AbsoluteFill, Composition, registerRoot, Sequence } from 'remotion';
import { GoldenText, TypewriterText } from 'remotion-presets/text';

const Demo: React.FC = () => (
  <AbsoluteFill
    style={{
      alignItems: 'center',
      justifyContent: 'center',
      background: '#09090b',
      color: 'white',
      fontFamily: 'sans-serif',
    }}
  >
    <Sequence durationInFrames={60}>
      <TypewriterText
        text="Create in motion."
        durationInFrames={42}
        style={{ fontSize: 86, fontWeight: 750, textAlign: 'center' }}
      />
    </Sequence>
    <Sequence from={60} durationInFrames={60}>
      <GoldenText
        text="GOLDEN HOUR"
        durationInFrames={36}
        intensity={1.1}
        style={{ fontSize: 106, fontWeight: 900, textAlign: 'center' }}
      />
    </Sequence>
  </AbsoluteFill>
);

const Root: React.FC = () => (
  <Composition
    id="PresetDemo"
    component={Demo}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={120}
  />
);

registerRoot(Root);
```

プリセットコンポーネントは基本的にcomposition全体を覆うレイヤーとして描画します。複数のプリセットを使う場合は、`Sequence`で時間を分けるか、子要素側の`position`で配置を明示してください。

## 5. import先を選ぶ

すべてのAPIは`remotion-presets`からimportできます。コード上の用途をカテゴリ単位で明確にするには、用途別のsubpathを推奨します。

| import先                       | 主な内容                                                     |
| ------------------------------ | ------------------------------------------------------------ |
| `remotion-presets/text`        | `TypewriterText`、`GoldenText`、`PresetText`、文字プリセット |
| `remotion-presets/animations`  | `OffscreenSlideIn`などの登場・要素アニメーション             |
| `remotion-presets/effects`     | `createPresetEffect`、`usePresetEffect`、`PresetLayer`       |
| `remotion-presets/looks`       | `VintageFilm`などの映像ルック                                |
| `remotion-presets/transitions` | `createPresetTransition`、トランジションfactory              |
| `remotion-presets/registry`    | `presetRegistry`、検索・メタデータAPI                        |

## 6. 同梱カタログを見る

ライブラリをcloneしたリポジトリ内で次を実行します。

```bash
npm ci
npm run dev
```

Remotion Studioには次のcompositionがあります。

- `PresetCatalog`: 228件を各90フレームで順番に表示
- `Review/PresetContactSheet`: 1ページ12件の一覧。Input Propsの`page`は0始まり
- `Review/PresetSingle`: Input Propsの`presetId`に任意の安定IDを指定して単体表示
- `Review/CanvasEffectSingle`: effects APIのCanvas処理を表示。`presetId`には`api: 'effects'`のIDを指定

カタログ全体をMP4へレンダーするには次を実行します。

```bash
npm run render:catalog --workspace @remotion-presets/studio
```

出力先は`out/catalog.mp4`です。全228件を各90フレーム収録するため、確認用としては長い動画になります。素早く確認する場合はStudioの`PresetSingle`または`PresetContactSheet`を使ってください。

## 7. 次に読むもの

- 利用できるpropsやfactoryの返り値: [APIガイド](api.md)
- IDとPremiere対応状況: [Premiere対応表](premiere-coverage.md)
- Canvas Effectsのプレビュー条件: [ブラウザとレンダリング](browser-and-rendering.md)
- MITとRemotion依存ライセンスの区別: [ライセンスについて](licensing.md)
