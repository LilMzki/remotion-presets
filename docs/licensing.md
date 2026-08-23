# ライセンスについて

このページは利用条件を分かりやすく区別するための案内であり、法的助言ではありません。実際の利用に際しては、各ライセンス本文の最新版を確認してください。

## remotion-presets本体

このリポジトリで独自に実装したコードは[MIT License](../LICENSE)で提供します。著作権表示とライセンス表示を残すことを条件に、利用、複製、変更、結合、公開、頒布、サブライセンス、販売が認められます。無保証です。

MITの対象には、このプロジェクトが独自に作成したTypeScript／Reactコード、プリセットのメタデータ、Studioカタログ、ドキュメントが含まれます。

## Remotion依存パッケージ

`remotion-presets`のMIT Licenseは、依存先のRemotionへMITを適用するものではありません。実行時には次のpeer dependencyを使用します。

- `remotion`
- `@remotion/transitions`
- `react`
- `react-dom`

同梱StudioとREADMEの動画例では、開発／利用側の依存として`@remotion/cli`、`@remotion/media`、`@remotion/effects`も使用します。

ReactとReact DOMはMIT Licenseです。一方、Remotionと`@remotion/*`にはRemotion独自の利用条件が適用されます。Remotion `4.0.515`に同梱されているライセンスでは、個人、従業員3名以下の営利組織、非営利組織、非商用評価などにFree Licenseの条件が設けられ、それ以外の対象組織にはCompany Licenseが必要とされています。また、Remotionの派生物を販売・再許諾する用途には制限があります。

条件は将来変更される可能性があり、組織形態や利用方法によって判断が異なります。必ず次を確認してください。

- [Remotion Licenseの最新版](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)
- [Remotion License & Pricing](https://www.remotion.dev/docs/license)
- インストールした`node_modules/remotion/LICENSE.md`

Remotionの利用条件について不明点がある場合は、Remotionへ直接確認してください。

## Adobeとの関係

本プロジェクトはAdobe Inc.の公式プロジェクトではなく、Adobeによる提携、承認、後援を受けていません。

Adobe、Adobe Premiere、Premiere Pro、および関連する名称は、Adobeの商標または登録商標です。本プロジェクトでは、ユーザーが機能対応を理解できるよう、比較対象となるエフェクト／トランジション名を説明目的で記載しています。

本リポジトリは次のものを含みません。

- Adobe製品のソースコード
- Premiere Proのプリセットファイルやプロジェクトテンプレート
- Premiere ProのUI、アイコン、スクリーンショットを複製した素材
- Adobeが提供する画像、動画、音声、フォント等のアセット

実装はRemotionとWeb標準技術を用いて独立に作成したものです。「Premiere対応」は、編集目的と主要な調整概念をRemotion上で扱えることを示し、Adobe実装との画素単位の同一性や完全互換性を意味しません。

## 生成物と素材

このライブラリ自体は、利用者がcompositionへ渡す画像、動画、音声、フォントの利用権を付与しません。レンダーへ組み込む素材については、利用者自身が必要な権利とクレジット条件を確認してください。

このライブラリを使って生成した動画の権利関係は、利用素材、フォント、Remotionライセンス、配布先の規約などにも左右されます。

## 再配布

`remotion-presets`をソースまたはビルド済みパッケージとして再配布する場合は、MIT License本文と著作権表示を含めてください。RemotionやReactを同梱する場合は、それぞれのライセンスと必要な表示も別途満たしてください。
