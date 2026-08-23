# ロードマップ

`remotion-presets`は、Remotion上で動画編集の意図を高レベルなプリセットとして扱うための長期プロジェクトです。Premiere Pro 26.0の映像項目204件を参照点にし、独自の複合プリセットも育てながら、共有実装から専用アルゴリズムへ段階的に成熟させます。

このロードマップは機能数だけで完成を判断しません。APIの安定性、個別アルゴリズム、調整項目、決定性、視覚検証、複数入力、解析、性能までを測定可能な完了条件として扱います。

## 目標としないこと

- Adobe実装とのpixel parityや内部アルゴリズムの同一性
- Adobe製品のコード、プリセットファイル、UI、素材の複製
- `.prproj`などAdobe固有ファイル形式との完全互換
- 公開情報から確認できない挙動を、同一であるかのように表示すること

目標は、各編集項目の用途、視覚的な役割、主要な調整概念を、Remotionで決定的かつ実用的に扱えることです。

## バージョン計画

| バージョン | 主題                       | 完了時の状態                                                                                                                         |
| ---------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 0.1        | 広い高レベルAPI            | Premiere参照204件を共有engine／familyの`approximate`実装として利用でき、独自Compound 24件を含む228 IDが台帳・API・Studioから到達可能 |
| 0.2        | 専用アルゴリズムと視覚基準 | 初期品質コホートを専用実装へ移し、プリセット固有の型付きcontrolsとvisual goldenで評価可能                                            |
| 0.3        | 時間・複数入力・解析       | frame-aware処理、複数素材、事前解析結果を渡すadapterを共通化し、解析依存項目を実用的なworkflowで扱える                               |
| 0.4        | GPU・性能・多解像度        | 適切な項目をWebGLへ移し、性能計測と複数解像度／aspect ratio／fpsのparity harnessを継続実行                                           |
| 1.0        | 専用実装と安定API          | Premiere参照204件がgeneric fallbackを主実装とせず、公開API・ID・保存形式がSemVerで安定                                               |

## 0.1 — 高レベルな土台

現在の0.1系は、Premiere参照項目を一度に「完成」と宣言する版ではなく、壮大な対象範囲を型付きAPIと検証可能な台帳へ落とす版です。

### 提供するもの

- Premiere Current 171件、Legacy 33件を、共有Canvas 2D engine、共有DOM/CSS engine、14種類の共有transition familyへ接続
- 文字、登場演出、映像ルック、編集演出のCompound 24件
- component、Effects、`TransitionSeries` presentationの3系統のAPI
- 静的`createPresetEffect()`とframe-awareな`usePresetEffect()`
- 安定ID、日英名称、日本語説明、controls、参照カテゴリ、fidelityを持つ`presetRegistry`
- 全体カタログ、コンタクトシート、単体DOM表示、単体Canvas Effect表示

### 0.1完了条件

- レジストリが合計228件、Premiere Current 171件、Legacy 33件、Compound 24件でテスト固定されている
- Premiere参照204件がすべて`approximate`で、`equivalent`を過大表示していない
- 228件すべてに重複しないkebab-case ID、日英名称、日本語説明、既定duration、controlsがある
- ESM、CommonJS、型定義、公開subpathを生成できる
- component、静的effect、frame-aware effect、transitionの代表APIがunit testを通る
- `PresetCatalog`、`PresetContactSheet`、`PresetSingle`、`CanvasEffectSingle`から対象を確認できる
- Node 20／22／24で型検査、テスト、ビルド、package smoke testが成功する

## 0.2 — 専用アルゴリズム、typed controls、visual golden

共有familyから、項目ごとの挙動と調整概念を持つ専用実装への移行を始めます。最初の品質コホートは、プロジェクト開始時に基準とした15件です。

### 実装項目

- `typewriter`、`golden-text`、`offscreen-slide-in`、`vintage-film`、`spring-motion`、`camera-shake`、`rgb-split`、`light-leaks`、`wonder-glow`、`mosaic-effect`、`vignette`、`cross-dissolve`、`whip`、`burn-alpha`、`neon-wipe`を個別にレビュー
- genericな`intensity`だけでなく、プリセット固有の意味を持つ型付きcontrolsを追加
- controlsのTypeScript型、実行時validation、レジストリmetadata、Studio入力を同じ定義から生成
- 代表フレームを固定するvisual goldenと、意図的な更新をレビューするworkflowを追加

### 0.2完了条件

- 初期品質コホート15件すべてが、共有familyのdefault branchだけに依存しない専用コードパスを持つ
- 15件すべてで、公開されるtyped controlsとmetadata上のcontrolsが自動テストで一致する
- 各項目について開始・中間・終了の3フレームを、16:9、9:16、1:1でgolden化する（最低135画像）
- 同じ入力、frame、fps、seedによる再レンダーがgolden harness上で決定的である
- `equivalent`へ昇格する項目は、後述の昇格条件をすべて満たす。満たさない項目は`approximate`のまま理由を残す

## 0.3 — 時間、複数入力、解析adapter

単一フレームの画素処理だけでは成立しない編集項目を、Remotionのレンダー方式に合う明示的なdata flowとして実装します。

### 実装項目

- frame、fps、durationを扱うeffect runtimeを、時間変化する全プリセットで共通化
- source、matte、reference、previous／next clipなど、複数入力を型付きで渡すinterfaceを追加
- レンダー前の解析結果をJSONとして渡せるversioned analysis adapterを追加
- `track-matte-key`でsourceとmatte、`posterize-time`で時間サンプリング、`warp-stabilizer`でmotion path、`auto-reframe`で被写体領域を扱う
- 解析器そのものと描画処理を分離し、外部CV／tracking実装を差し替え可能にする

### 0.3完了条件

- 複数入力interfaceに、入力不足、寸法不一致、duration不一致を説明するruntime validationがある
- analysis schemaに`schemaVersion`、素材識別子、座標系、解析fps、解析durationがあり、JSON round-trip testを通る
- Track Matte、Posterize Time、Warp Stabilizer、Auto Reframeの4 fixtureが、解析生成またはfixture読込から最終レンダーまでend-to-end testを通る
- フレームの評価順や並列レンダー数を変えても出力が変わらない
- adapterがない場合のfallbackと制限が、APIエラーまたはmetadataで明示される

## 0.4 — GPU、性能、多解像度parity harness

専用処理のうちGPUに適した項目をWebGLへ移し、速さと表示条件の違いを継続的に測ります。

### 実装項目

- blur、distort、keying、glow、VRなどから、GPU化の効果が高い専用実装をWebGLへ移行
- Canvas 2D／DOM fallbackとWebGLの結果を同じfixtureで比較するparity harnessを追加
- 16:9、9:16、1:1、24／30／60fps、複数の解像度をmatrix化
- CPU時間、GPU時間、peak memory、1フレーム当たりの処理時間を記録するbenchmarkを追加

### 0.4完了条件

- WebGL対象項目が実際のshaderコードパスを持ち、`renderMode` metadataと実バックエンドが一致する
- 1920×1080、1080×1920、1080×1080を24／30／60fpsで代表fixtureへ通すCIまたは定期parity jobがある
- deterministic項目は、同じbackendと入力でframe hashが一致する
- backend間比較は項目ごとに知覚差分の許容値を文書化し、閾値超過で失敗する
- 公開したreference machineとfixtureでbenchmark基準値を保存し、15%以上の性能悪化を検出する
- GPUがない環境でCanvas 2D／DOM fallbackへ移行するか、実行不能理由を明確に返す

## 1.0 — 専用実装と安定API

1.0は、件数だけでなく各項目の責任範囲を確定し、利用側が長期運用できる状態を意味します。

### 1.0完了条件

- Premiere参照204件すべてが、generic engine／transition familyのfallbackだけを主実装としない専用コードパスを持つ
- 204件すべてについて、主要controls、validation、決定性、代表golden、既知の制限が文書化されている
- 複数入力または解析が必要な項目には、versioned adapterか、対応しない範囲を示す明示的なAPIエラーがある
- 公開ID、subpath、主要props、`PresetInstance.schemaVersion`の互換性方針をSemVerで固定する
- 破壊的変更のmigration guideとdeprecation期間を定義する
- 対応表のfidelityを項目ごとに再審査し、昇格条件を満たすものだけを`equivalent`にする
- npm公開前のpackage smoke test、ESM／CommonJS consumer test、Studio build、代表レンダー、ライセンス監査がすべて成功する

専用実装であっても、解析精度やAdobe固有処理との差が残る場合は`approximate`のままです。1.0は全項目を`equivalent`と表示することではなく、全項目に専用の責任ある実装と正確なfidelity表示があることを意味します。

## `equivalent`への昇格条件

Premiere参照項目は、次の条件をすべて満たした場合だけ`approximate`から`equivalent`へ昇格できます。

1. 共有familyのdefault branchではなく、その項目のための専用アルゴリズムが主経路である。
2. Premiereでの主要な調整概念に対応するtyped controlsとruntime validationがある。
3. 代表fixtureの開始・中間・終了、および対応するaspect ratioのvisual goldenがレビュー済みである。
4. 同じ入力、frame、fps、seedで決定的にレンダーされ、複数解像度で破綻しない。
5. 複数入力や解析が必要なら、versioned adapterとend-to-end fixtureがある。
6. 公開されているPremiereの挙動を参照して、用途、視覚的役割、主要controlsが機能的に対応するとレビューされている。
7. 残る差分、未対応controls、性能上の制限がmetadataと対応表に記載されている。

この判定はpixel parityを要求しません。一方で、「似た色」「同じカテゴリ」といった主観だけでは昇格させません。

## 進捗の可視化

- `presetRegistry`のfidelityと`noteJa`を機械可読な唯一の対応状況とする
- GitHub milestoneで0.2、0.3、0.4、1.0の対象項目を管理する
- Pull Requestで専用コードパス、controls、golden、性能、ドキュメントのチェック項目を確認する
- リリースごとに、`approximate`／`equivalent`件数と昇格・後退理由をCHANGELOGへ記録する

現在の正確な件数と全IDは[Premiere対応表](premiere-coverage.md)を参照してください。
