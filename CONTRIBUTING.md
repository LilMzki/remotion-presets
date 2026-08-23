# コントリビューションガイド

remotion-presetsへの貢献を歓迎します。このプロジェクトは、動画編集でよく使う表現を、生のキーフレームや座標列を組まずに利用できる高レベルなRemotionプリセットとして提供します。

## 開発環境

- Node.js 20.19以上、22.13以上、または24以上。ローカル開発には24を推奨します。
- npm。lockfileを唯一の依存関係の基準として扱います。
- Chromiumを実行できる環境。映像に関する変更ではRemotionのレンダー確認が必要です。

初回セットアップと通常の検査は次のとおりです。

```sh
npm ci
npm run validate
```

Studioカタログは次のコマンドで開けます。

```sh
npm run dev
```

## IssueとPull Request

大きな公開API変更や新しいプリセット群は、実装前にIssueで利用場面とAPI案を共有してください。小さな不具合修正やドキュメント改善は直接Pull Requestを作成できます。

Pull Requestは1つの目的に絞り、次を含めてください。

- 変更理由と利用者への効果
- 追加・変更した公開APIの利用例
- unit testまたはregistry test
- 見た目が変わる場合のVisual QA結果
- 互換性に影響する場合の移行方法

## Remotionのバージョン規則

Remotionの公式パッケージは内部実装を共有するため、バージョンの不一致がビルド時またはレンダー時の予期しない問題につながります。

- Studioの`remotion`とすべての`@remotion/*`依存は、`^`や`~`を付けず、同じ完全固定バージョンにしてください。
- Remotionを更新するときは、すべての公式パッケージとlockfileを1つのPull Requestで同時に更新してください。
- 公開ライブラリの`peerDependencies`は対応範囲を表します。検証なしに下限やメジャー上限を変更しないでください。
- 更新後は型検査、テスト、ビルドに加えてStudioカタログをレンダーしてください。

DependabotもRemotion関連の更新を1つのグループにまとめます。メジャーアップデートは互換性を検証して手動で行います。

## プリセットの設計

プリセットは「どう動かすか」ではなく「どの編集表現を使うか」をAPIにします。

- `intensity`、`direction`、`durationInFrames`、`seed`など、編集者に意味のあるpropsを優先してください。
- 座標配列、生のキーフレーム列、CSS文字列だけを主要APIにしないでください。
- 乱数が必要な場合はseedから決定的に生成し、`Math.random()`、現在時刻、実行順序へ依存しないでください。
- 解像度やfpsを固定値と仮定せず、16:9、9:16、1:1および24fps、30fps、60fpsで自然に見える実装にしてください。
- IDは既存の命名規則に合わせた英小文字のkebab-caseとし、既存IDを再利用しないでください。
- registry metadataには日本語の説明、カテゴリ、既定値、主要パラメータ、描画方式、Premiere対応状況、再現度を記載してください。
- Adobeのコードや素材を複製せず、公開仕様と自作した検証素材から機能的に同等な表現を実装してください。
- 解析が必要な機能を決定的な近似で実装する場合は、metadataとドキュメントで`approximate`であることを明示してください。

## テスト

変更を送る前に次の検査を実行してください。

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm pack --dry-run --workspace=remotion-presets
```

テストでは少なくとも次を確認します。

- registryのID、分類、件数、必須metadata
- 開始・中間・終了フレームで例外、`NaN`、空表示が発生しないこと
- 同じ入力とseedから同じ出力が得られること
- subpath exportとESM/CJSの公開契約が保たれること
- 不正な入力に対する安全なclampまたは明確なエラー

## Visual QA

見た目に関わる変更は、自動テストだけで完了としません。

1. `npm run dev`でStudioカタログを開き、対象プリセットを開始・中間・終了フレームで確認します。
2. 16:9、9:16、1:1と24fps、30fps、60fpsを確認します。文字切れ、画面外への意図しない欠け、ちらつき、急な速度変化を探してください。
3. 次のコマンドで対象プリセットの開始・中間・終了を実レンダーし、CIと同じ経路で描画が完了することを確認します。`typewriter`は変更したプリセットIDに置き換えてください。

   ```sh
   node scripts/render-representative-presets.mjs --preset typewriter --frame 0 --frame 60 --frame 149 --output outputs/visual-qa
   ```

   registry全体や共通描画基盤を変更した場合は、引数を付けずに代表15種をレンダーし、`npm run render:catalog --workspace=@remotion-presets/studio`で全カタログも確認してください。

4. 変更前後を比較できる画像または短い動画をPull Requestへ添付します。新規プリセットでは開始・中間・終了フレームを含めてください。
5. Canvas/WebGLを使う場合は、StudioプレビューだけでなくCLIレンダーでも色、alpha、合成順序を確認します。

レビューでは、見栄えだけでなく既定値の実用性、異なるアスペクト比での読みやすさ、決定性、レンダー負荷も確認します。

## 文書とコミット

公開APIを変更した場合はREADME、カタログ、使用例も同時に更新してください。コミットメッセージの形式は強制しませんが、命令形または変更内容が短く分かる表現を推奨します。

コントリビューションを送ることで、提出物をこのリポジトリのMITライセンスの下で配布することに同意したものとみなします。
