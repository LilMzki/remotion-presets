# 変更履歴

このプロジェクトの主な変更を記録します。形式は[Keep a Changelog](https://keepachangelog.com/ja/1.1.0/)を参考にし、バージョン番号は[Semantic Versioning](https://semver.org/lang/ja/)に従います。

## [0.1.0] - 2026-08-24

### 追加

- Remotion `4.0.515`向けの高レベル映像編集プリセット228件を初公開。
- Premiere Pro 26.0を参照したCurrent 171件とLegacy 33件の対応台帳。
- Premiere参照204件を共有engine／familyによる決定的な`approximate`実装として提供。
- 文字、登場演出、映像ルック、編集演出をまとめた独自の複合プリセット24件。
- `TypewriterText`、`GoldenText`、`OffscreenSlideIn`を含むReactコンポーネントAPI。
- RemotionのEffects APIへ接続する静的`createPresetEffect()`、frame-awareな`usePresetEffect()`、`TransitionSeries`へ接続する`createPresetTransition()`。
- 安定ID、日英表示名、日本語説明、調整項目、描画方式、Premiere対応状況を検索できる`presetRegistry`。
- 全プリセット、単体表示、コンタクトシート、Canvas Effectsを確認できるRemotion Studioカタログ。
- ESM、CommonJS、型定義、用途別subpath export。
- 日本語の導入、API、Premiere対応、ブラウザ／レンダリング、ライセンス文書。
- 型検査、unit test、レジストリ整合性検査、ビルドを行う検証環境。
