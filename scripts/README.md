# リリース検証スクリプト

リポジトリ直下で、配布パッケージのスモークテストを実行します。

```sh
node scripts/smoke-package.mjs
```

`remotion-presets`をビルドし、実際の`npm pack` tarballを作り、peer dependencyとともに隔離した一時プロジェクトへインストールします。その後、すべての公開subpathをESMとCommonJSの両方からimportし、`.mts`と`.cts`のconsumerから型を解決できることも検査します。レジストリのTypeScriptソースを直接参照しないため、利用者が受け取る配布物そのものを検証できます。既存の`dist`を使う場合は`--skip-build`、診断用に一時ディレクトリを残す場合は`--keep-temp`を指定します。

全107件のCanvas Effectsを実ブラウザーで検査します。

```sh
npm run audit:effects
```

同じSVG入力へ全effects descriptorを適用し、未加工baselineとの差分が全件にあることを確認します。さらに、キーカラーの透過、同一frameの決定性、noiseとcamera shakeの隣接frame変化を検査します。既存の`dist`を使う場合は`npm run audit:effects -- --skip-build`を指定します。

代表15プリセットの開始・中間・終了フレームをレンダーします。

```sh
node scripts/render-representative-presets.mjs
```

このスクリプトはライブラリをビルドし、公開レジストリでIDを検証し、Studioを一度だけbundleしてから、Remotionの`renderStill()`で各画像を書き出します。effectsプリセットは実際の`HtmlInCanvas` effects chain、componentとtransitionは通常の単体プレビューを通ります。PNGはGit管理外の`outputs/representative-presets`へ保存されます。単一プリセットだけを素早く確認する例です。

```sh
node scripts/render-representative-presets.mjs --preset typewriter --frame 60 --scale 0.5
```

すべてのオプションは`--help`で確認できます。

## Canvas2D effectsの全件監査

107件のeffectsプリセットを、実際のRemotion Chromeレンダラーで横断検証します。

```sh
npm run audit:effects
```

同一のSVG入力に対する効果あり/効果なしのグリッドをピクセル比較し、厳密なno-opが1件でもあれば失敗します。さらに、`color-key`が背景を透過させること、`noise`が同一フレームで決定的かつ隣接フレームで変化すること、`camera-shake`、`strobe-light`、`posterize-time`、`echo-glow`、`grow`、`shrink`、`gradient-wipe-effect`、`legacy-linear-wipe`、`legacy-block-dissolve`が想定したフレーム間で時間変化することを検証します。

Visual render CIにも含まれるブラウザー検証です。ローカルで既存の`dist`を使う場合は`--skip-build`、診断用に一時PNGとbundleを残す場合は`--keep-temp`を指定します。監査対象のStudio compositionは`CanvasEffectAudit`、`CanvasEffectAuditBaseline`、`CanvasEffectAuditSingle`です。
