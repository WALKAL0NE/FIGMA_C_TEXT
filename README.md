# Figma Text Style Exporter

選択したテキスト要素のスタイルをSASS形式でエクスポートするFigmaプラグイン。

## 機能

- テキスト要素から6つのスタイルプロパティを抽出
- カスタマイズ可能なテンプレートでSASSコードを生成
- フォント名を変数名（エイリアス）に置き換え
- 単位の自動変換（px→rem、%→em等）
- ワンクリックでクリップボードにコピー

## インストール

```bash
bun install
```

## 開発コマンド

| コマンド | 説明 |
|---------|------|
| `bun run build` | TypeScript → JavaScript コンパイル |
| `bun run watch` | 監視モード（変更時自動コンパイル） |

## 抽出するスタイルプロパティ

| プロパティ | 変数名 | 変換内容 |
|-----------|--------|----------|
| フォントサイズ | `$size` | px → rem |
| フォントウェイト | `$weight` | 数値 → 名前（bold, normal等） |
| フォントファミリー | `$family` | エイリアス置換対応 |
| 字間 | `$spacing` | % → em |
| 行間 | `$lineHeight` | % → 小数 |
| テキスト配置 | `$textAlign` | CENTER → center等 |

## テンプレート変数

テンプレートで使用できる変数と対応する単位：

| 変数 | 対応単位 |
|------|----------|
| `$size(unit)` | `px`, `rem`, `unitless` |
| `$weight(unit)` | `num`, `name` |
| `$family` | - |
| `$spacing(unit)` | `em`, `px`, `%`, `unitless` |
| `$lineHeight(unit)` | `%`, `unitless`, `px` |
| `$textAlign` | - |

### デフォルトテンプレート

```sass
+text($size(rem), $weight, $family)
letter-spacing: $spacing(em)
line-height: $lineHeight
```

## 設定

| 項目 | 説明 | デフォルト |
|------|------|-----------|
| Base Font Size | 1rem の基準ピクセル値 | 16px |
| Skip letter-spacing: 0 | 字間が0の場合は出力から省略 | true |
| Storage Scope | 設定の保存範囲（ファイル単位/グローバル） | file |

## アーキテクチャ

```
code.ts (929行)
├── メインスレッド (1-203行)
│   ├── 単位変換関数 (pxToRem, getFontWeightString, letterSpacingToEm)
│   ├── スタイル抽出 (extractTextStyles, checkCurrentSelection)
│   └── 永続化 (loadSettings, saveSettings, loadAliases, saveAliases)
│
├── UI HTML (205-835行)
│   ├── テンプレートエンジン (parseTemplate, applyTemplate)
│   ├── 設定UI
│   └── クリップボード機能（3段階フォールバック）
│
└── 初期化・イベント処理 (838-929行)
    ├── figma.showUI()
    ├── initializePlugin()
    ├── selectionchange イベント
    └── figma.ui.onmessage ハンドラ
```

## メッセージ通信

### UI → メインスレッド

| type | 説明 |
|------|------|
| `ui-ready` | UI準備完了 |
| `get-aliases` / `save-aliases` | エイリアス取得/保存 |
| `get-settings` / `save-settings` | 設定取得/保存 |
| `change-storage-scope` | ストレージスコープ変更 |
| `copy-success` | コピー成功通知 |

### メインスレッド → UI

| type | 説明 |
|------|------|
| `no-selection` / `no-text` | 選択エラー |
| `style-extracted` | 抽出されたスタイル |
| `aliases-loaded` / `settings-loaded` | データ読み込み完了 |
| `scope-changed` | スコープ変更完了 |

## ストレージ

設定とエイリアスは2つのスコープで保存可能：

1. **ファイル固有** (`figma.root.getPluginData`) - Figmaファイルに埋め込み
2. **グローバル** (`figma.clientStorage`) - ローカルデバイスに保存

読み込み時はファイル固有 → グローバルの優先順位で検索。

## 技術スタック

- TypeScript
- Bun
- Figma Plugin API v1.0.0
- @figma/plugin-typings v1.50.0

## ファイル構成

| ファイル | 役割 |
|----------|------|
| `code.ts` | メインロジック + 埋め込みUI |
| `code.js` | ビルド出力（Figmaが読み込む） |
| `manifest.json` | プラグイン設定 |
| `ui.html` | 存在するが未使用（UIは`code.ts`に埋め込み） |

## 特記事項

- UIは`ui.html`ではなく`code.ts`内の`htmlContent`定数として埋め込み
- letter-spacing 0省略機能: 字間が0emの行は出力から完全に削除
- 入力中のUI再描画防止: フォーカス維持のため
- テンプレート保存は500msのデバウンス処理あり
