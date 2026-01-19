"use strict";
// Figma Text Style Exporter Plugin
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function pxToRem(px, basePixelSize = 16) {
    const remValue = (px / basePixelSize).toFixed(3);
    return `${parseFloat(remValue)}rem`;
}
function getFontWeightString(weight) {
    const weightMap = {
        100: 'thin',
        200: 'extralight',
        300: 'light',
        400: 'normal',
        500: 'medium',
        600: 'semibold',
        700: 'bold',
        800: 'extrabold',
        900: 'black'
    };
    return weightMap[weight] || 'normal';
}
function letterSpacingToEm(letterSpacing) {
    if (letterSpacing.unit === 'PERCENT') {
        const emValue = `${(letterSpacing.value / 100).toFixed(2)}em`;
        console.log('[Plugin] letterSpacingToEm:', letterSpacing.value, '% ->', emValue);
        return emValue;
    }
    console.log('[Plugin] letterSpacingToEm: not PERCENT, returning 0em');
    return '0em';
}
// Auto line-heightの実際の値を計算
function calculateAutoLineHeight(node) {
    return __awaiter(this, void 0, void 0, function* () {
        const fontSize = node.fontSize;
        const originalText = node.characters;
        // Missing fontチェック
        if (node.hasMissingFont) {
            console.log('[Plugin] Missing font detected, using default line-height');
            return 1.2; // デフォルト値
        }
        // フォントを読み込み
        const fontName = node.fontName;
        if (fontName === figma.mixed) {
            const firstCharFont = node.getRangeFontName(0, 1);
            yield figma.loadFontAsync(firstCharFont);
        }
        else {
            yield figma.loadFontAsync(fontName);
        }
        // 元の状態を保存
        const originalParent = node.parent;
        const originalIndex = originalParent && 'children' in originalParent
            ? originalParent.children.indexOf(node)
            : 0;
        const originalLeadingTrim = node.leadingTrim;
        const originalAutoResize = node.textAutoResize;
        const originalWidth = node.width;
        const originalHeight = node.height;
        const originalX = node.x;
        const originalY = node.y;
        const hasVerticalTrim = originalLeadingTrim !== figma.mixed && originalLeadingTrim === 'CAP_HEIGHT';
        // 一時的にページ直下に移動（Auto Layout制約を解除）
        const page = figma.currentPage;
        page.appendChild(node);
        // 上下トリミングを一時解除
        if (hasVerticalTrim) {
            node.leadingTrim = 'NONE';
        }
        // テキストボックスを自動サイズに変更して一行にする
        node.textAutoResize = 'WIDTH_AND_HEIGHT';
        // 改行コードも削除
        const hasExplicitLineBreaks = originalText.includes('\n');
        if (hasExplicitLineBreaks) {
            node.characters = originalText.replace(/\n/g, '');
        }
        // 高さを取得（一行の状態）
        const singleLineHeight = node.height;
        // === 元に戻す（順序が重要）===
        // 1. まずテキストを元に戻す
        if (hasExplicitLineBreaks) {
            node.characters = originalText;
        }
        // 2. textAutoResizeを元に戻す
        node.textAutoResize = originalAutoResize;
        // 3. 幅を固定に戻す場合はリサイズ（HEIGHT固定モードの場合）
        if (originalAutoResize === 'HEIGHT') {
            node.resize(originalWidth, node.height);
        }
        else if (originalAutoResize === 'NONE') {
            node.resize(originalWidth, originalHeight);
        }
        // 4. トリミングを元に戻す
        if (hasVerticalTrim) {
            node.leadingTrim = originalLeadingTrim;
        }
        // 5. 元の親に戻す
        if (originalParent && 'insertChild' in originalParent) {
            originalParent.insertChild(originalIndex, node);
        }
        // 6. 位置を元に戻す
        node.x = originalX;
        node.y = originalY;
        // line-height = 一行の高さ / フォントサイズ
        const calculatedLineHeight = singleLineHeight / fontSize;
        console.log('[Plugin] Calculated auto line-height:', calculatedLineHeight, '(singleLineHeight:', singleLineHeight, ', fontSize:', fontSize, ')');
        return calculatedLineHeight;
    });
}
function extractTextStyles(node_1) {
    return __awaiter(this, arguments, void 0, function* (node, basePixelSize = 16) {
        const fontSize = node.fontSize;
        const fontWeight = node.fontWeight;
        const fontFamily = node.fontName;
        const letterSpacing = node.letterSpacing;
        const lineHeight = node.lineHeight;
        const textAlign = node.textAlignHorizontal;
        let lineHeightValue = 1;
        if (lineHeight && lineHeight !== figma.mixed) {
            const lineHeightObj = lineHeight;
            if ('value' in lineHeightObj && 'unit' in lineHeightObj) {
                if (lineHeightObj.unit === 'PERCENT') {
                    lineHeightValue = lineHeightObj.value / 100;
                }
                else if (lineHeightObj.unit === 'PIXELS') {
                    lineHeightValue = lineHeightObj.value / fontSize;
                }
            }
            else if (lineHeightObj.unit === 'AUTO') {
                // Auto line-heightの場合、実際の高さから計算
                lineHeightValue = yield calculateAutoLineHeight(node);
            }
            else if (typeof lineHeightObj === 'object' && 'value' in lineHeightObj) {
                lineHeightValue = lineHeightObj.value / fontSize;
            }
        }
        // テキスト配置の変換
        let textAlignValue = 'left';
        if (textAlign !== figma.mixed) {
            switch (textAlign) {
                case 'CENTER':
                    textAlignValue = 'center';
                    break;
                case 'RIGHT':
                    textAlignValue = 'right';
                    break;
                case 'JUSTIFIED':
                    textAlignValue = 'justify';
                    break;
                default: textAlignValue = 'left';
            }
        }
        return {
            fontSize: pxToRem(fontSize, basePixelSize),
            fontWeight: getFontWeightString(fontWeight),
            fontFamily: fontFamily.family,
            letterSpacing: letterSpacing !== figma.mixed ? letterSpacingToEm(letterSpacing) : '0em',
            lineHeight: lineHeightValue.toFixed(2).replace(/\.?0+$/, ''),
            textAlign: textAlignValue
        };
    });
}
function checkCurrentSelection() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('[Plugin] checkCurrentSelection called');
        const selection = figma.currentPage.selection;
        if (selection.length === 0) {
            console.log('[Plugin] No selection found');
            figma.ui.postMessage({
                type: 'no-selection',
                message: 'Please select a text element'
            });
            return;
        }
        const textNodes = selection.filter(node => node.type === 'TEXT');
        if (textNodes.length === 0) {
            console.log('[Plugin] No text nodes found');
            figma.ui.postMessage({
                type: 'no-text',
                message: 'Please select a text element'
            });
            return;
        }
        const textNode = textNodes[0];
        const styles = yield extractTextStyles(textNode, pluginSettings.basePixelSize);
        console.log('[Plugin] Text styles extracted:', styles);
        figma.ui.postMessage({
            type: 'style-extracted',
            styles: styles
        });
    });
}
// プラグイン側でエイリアスと設定を管理
let pluginAliases = {};
let pluginSettings = {
    template: '+text($size(rem), $weight, $family)\nletter-spacing: $spacing(em)\nline-height: $lineHeight',
    basePixelSize: 16,
    skipZeroLetterSpacing: true
};
// ストレージスコープ管理
let storageScope = 'file'; // デフォルトはファイル固有
// ストレージ操作（2層構造: ファイル固有 → デバイス共通）
function loadAliases() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // 優先1: ファイル固有の設定
            const fileSpecific = figma.root.getPluginData('fontAliases');
            if (fileSpecific) {
                pluginAliases = JSON.parse(fileSpecific);
                storageScope = 'file';
                console.log('[Plugin] Loaded file-specific aliases:', pluginAliases);
                return;
            }
            // 優先2: デバイス共通のデフォルト設定
            const saved = yield figma.clientStorage.getAsync('fontAliases');
            if (saved) {
                pluginAliases = saved;
                storageScope = 'global';
                console.log('[Plugin] Loaded global aliases:', pluginAliases);
                return;
            }
            console.log('[Plugin] No aliases found, using empty object');
        }
        catch (err) {
            console.error('Failed to load aliases:', err);
        }
    });
}
function saveAliases() {
    return __awaiter(this, arguments, void 0, function* (scope = storageScope) {
        try {
            if (scope === 'file') {
                // ファイル固有に保存
                figma.root.setPluginData('fontAliases', JSON.stringify(pluginAliases));
                console.log('[Plugin] Saved to file-specific storage');
            }
            else {
                // デバイス共通に保存
                yield figma.clientStorage.setAsync('fontAliases', pluginAliases);
                console.log('[Plugin] Saved to global storage');
            }
            storageScope = scope;
        }
        catch (err) {
            console.error('Failed to save aliases:', err);
        }
    });
}
function loadSettings() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // 優先1: ファイル固有の設定
            const fileSpecific = figma.root.getPluginData('pluginSettings');
            if (fileSpecific) {
                pluginSettings = JSON.parse(fileSpecific);
                console.log('[Plugin] Loaded file-specific settings:', pluginSettings);
                return;
            }
            // 優先2: デバイス共通のデフォルト設定
            const saved = yield figma.clientStorage.getAsync('pluginSettings');
            if (saved) {
                pluginSettings = saved;
                console.log('[Plugin] Loaded global settings:', pluginSettings);
                return;
            }
            console.log('[Plugin] No settings found, using defaults');
        }
        catch (err) {
            console.error('Failed to load settings:', err);
        }
    });
}
function saveSettings() {
    return __awaiter(this, arguments, void 0, function* (scope = storageScope) {
        try {
            if (scope === 'file') {
                // ファイル固有に保存
                figma.root.setPluginData('pluginSettings', JSON.stringify(pluginSettings));
                console.log('[Plugin] Saved to file-specific storage');
            }
            else {
                // デバイス共通に保存
                yield figma.clientStorage.setAsync('pluginSettings', pluginSettings);
                console.log('[Plugin] Saved to global storage');
            }
        }
        catch (err) {
            console.error('Failed to save settings:', err);
        }
    });
}
// インラインHTML
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Text Style Exporter</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
      margin: 0; padding: 16px; background: #fff; font-size: 14px; color: #333;
    }
    h1 { font-size: 18px; margin: 0 0 16px 0; color: #000; }
    h3 { margin: 0 0 8px 0; }
    .message { padding: 12px; background: #f5f5f5; border-radius: 4px; text-align: center; color: #666; margin-bottom: 16px; }
    .code-container {
      position: relative;
      margin-bottom: 16px;
    }
    .code-block {
      background: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 4px; padding: 12px;
      font-family: Monaco, monospace; font-size: 12px; white-space: pre; overflow-x: auto;
      min-height: 60px; cursor: text; user-select: text; 
    }
    .copy-icon {
      position: absolute;
      top: 0px;
      right: 0px;
      background: rgba(255, 255, 255, 0.8);
      border: 1px solid #ddd;
      border-radius: 4px;
      width: 28px;
      height: 28px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      padding: 0px;
    }
    .copy-icon:hover {
      background: #fff;
      border-color: #18a0fb;
    }
    .copy-icon svg {
      width: 16px;
      height: 16px;
      fill: #666;
    }
    .copy-icon:hover svg {
      fill: #18a0fb;
    }
    .copy-icon.copied {
      background: #18a0fb;
      border-color: #18a0fb;
    }
    .copy-icon.copied svg {
      fill: white;
    }
    button {
      background: #18a0fb; color: white; border: none; border-radius: 4px;
      padding: 8px 16px; font-size: 12px; cursor: pointer; margin: 4px;
    }
    button:hover { background: #0090e7; }
    .section { margin: 16px 0; padding: 12px; border: 1px solid #e0e0e0; border-radius: 4px; }
    .form-row { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
    input, textarea { flex: 1; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; }
    textarea {
      font-family: Monaco, monospace;
      min-height: 80px;
      resize: none;
      field-sizing: content;
      min-height: 0px;
      height: auto;
    }
  </style>
</head>
<body>
  <h1>Text Style Exporter</h1>
  <div id="content">
    <div class="message">Select a text element to export its style</div>
  </div>
  
  <script>
    console.log('UI Script loaded');

    let currentSassCode = '';
    let currentStyles = null;
    let fontAliases = {};
    let settings = {
      template: '+text($size(rem), $weight, $family)\\nletter-spacing: $spacing(em)\\nline-height: $lineHeight',
      basePixelSize: 16,
      skipZeroLetterSpacing: true
    };
    let storageScope = 'file'; // 'file' or 'global'

    parent.postMessage({ pluginMessage: { type: 'ui-ready' } }, '*');
    parent.postMessage({ pluginMessage: { type: 'get-aliases' } }, '*');
    parent.postMessage({ pluginMessage: { type: 'get-settings' } }, '*');
    
    function updateSassCode() {
      console.log('[UI] updateSassCode called, currentStyles:', !!currentStyles);
      if (!currentStyles) return;
      currentSassCode = applyTemplate(settings.template, currentStyles, fontAliases);
      console.log('[UI] SASS code generated:', currentSassCode);
      const codeBlock = document.querySelector('.code-block');
      if (codeBlock) {
        codeBlock.textContent = currentSassCode;
      }
    }
    
    function parseTemplate(template) {
      const regex = /\\$(size|weight|family|spacing|lineHeight|textAlign)(?:\\(([^)]+)\\))?/g;
      const variables = [];
      let match;
      while ((match = regex.exec(template)) !== null) {
        variables.push({
          fullMatch: match[0],
          variable: match[1],
          unit: match[2] || 'default'
        });
      }
      return variables;
    }
    
    function applyTemplate(template, styles, aliases) {
      const fontFamily = aliases[styles.fontFamily] || "'" + styles.fontFamily + "'";
      const variables = parseTemplate(template);
      let result = template;
      
      variables.forEach(({fullMatch, variable, unit}) => {
        let value = '';
        switch (variable) {
          case 'size':
            value = convertFontSize(styles.fontSize, unit);
            break;
          case 'weight':
            value = convertFontWeight(styles.fontWeight, unit);
            break;
          case 'family':
            value = fontFamily;
            break;
          case 'spacing':
            value = convertLetterSpacing(styles.letterSpacing, unit);
            // letter-spacing 0値省略機能（数値で比較）
            const numericValue = parseFloat(styles.letterSpacing.replace('em', ''));
            console.log('[UI] letter-spacing debug:', {
              rawValue: styles.letterSpacing,
              convertedValue: value,
              numericValue: numericValue,
              skipZeroLetterSpacing: settings.skipZeroLetterSpacing,
              shouldSkip: settings.skipZeroLetterSpacing && numericValue === 0
            });
            
            if (settings.skipZeroLetterSpacing && numericValue === 0) {
              console.log('[UI] Skipping letter-spacing line');
              // 該当行全体を削除（改行も含む）
              const lineRegex = new RegExp('letter-spacing: \\\\$spacing\\\\([^)]*\\\\)[^\\\\n]*\\\\n?', 'g');
              result = result.replace(lineRegex, '');
              return; // 通常の置換をスキップ
            }
            break;
          case 'lineHeight':
            value = convertLineHeight(styles.lineHeight, unit);
            break;
          case 'textAlign':
            value = styles.textAlign;
            break;
        }
        result = result.replace(fullMatch, value);
      });
      
      return result;
    }
    
    function convertFontSize(value, unit) {
      const remValue = parseFloat(value.replace('rem', ''));
      console.log('convertFontSize:', value, 'unit:', unit, 'basePixelSize:', settings.basePixelSize);
      switch (unit) {
        case 'px':
          const pxValue = (remValue * settings.basePixelSize).toFixed(0) + 'px';
          console.log('converted to px:', pxValue);
          return pxValue;
        case 'rem': return value;
        case 'unitless': return remValue.toFixed(3);
        default: return value;
      }
    }

    function convertFontWeight(value, unit) {
      // valueは既に名前形式 (e.g., 'bold', 'normal')
      // 元の数値が必要な場合は逆マッピング
      const nameToNum = {
        'thin': 100,
        'extralight': 200,
        'light': 300,
        'normal': 400,
        'medium': 500,
        'semibold': 600,
        'bold': 700,
        'extrabold': 800,
        'black': 900
      };

      switch (unit) {
        case 'num':
        case 'number':
          return nameToNum[value] || 400;
        case 'name':
        case 'default':
        default:
          return value;
      }
    }

    function convertLetterSpacing(value, unit) {
      const emValue = parseFloat(value.replace('em', ''));
      switch (unit) {
        case '%': return (emValue * 100).toFixed(1) + '%';
        case 'em': return value;
        case 'unitless': return emValue.toFixed(2);
        case 'px': return (emValue * settings.basePixelSize).toFixed(1) + 'px';
        default: return value;
      }
    }
    
    function convertLineHeight(value, unit) {
      const numValue = parseFloat(value);
      switch (unit) {
        case '%': return (numValue * 100).toFixed(0) + '%';
        case 'unitless':
        case 'default': return value;
        case 'px': return (numValue * settings.basePixelSize).toFixed(0) + 'px';
        default: return value;
      }
    }
    
    async function copyWithIcon(button) {
      console.log('[UI] copyWithIcon called');
      try {
        await copyToClipboard();
        
        // アイコンを変更してフィードバック
        button.classList.add('copied');
        button.innerHTML = \`
          <svg viewBox="0 0 24 24">
            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
          </svg>
        \`;
        
        // 2秒後に元に戻す
        setTimeout(() => {
          button.classList.remove('copied');
          button.innerHTML = \`
            <svg viewBox="0 0 24 24">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
          \`;
        }, 2000);
      } catch (err) {
        console.error('[UI] copyWithIcon error:', err);
      }
    }
    
    async function copyToClipboard() {
      console.log('[UI] copyToClipboard called, currentSassCode:', currentSassCode);
      
      if (!currentSassCode) {
        console.error('[UI] No SASS code to copy');
        return;
      }
      
      // 方法1: 現代的なClipboard APIを試行
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(currentSassCode);
          console.log('[UI] Clipboard API copy successful');
          parent.postMessage({ pluginMessage: { type: 'copy-success' } }, '*');
          return;
        }
      } catch (err) {
        console.warn('[UI] Clipboard API failed:', err);
      }
      
      // 方法2: execCommandでコピー試行
      try {
        const textarea = document.createElement('textarea');
        textarea.value = currentSassCode;
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        textarea.style.width = '1px';
        textarea.style.height = '1px';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        textarea.setAttribute('readonly', '');
        textarea.setAttribute('tabindex', '-1');
        document.body.appendChild(textarea);
        
        // スクロールを引き起こさないfocus
        textarea.focus({ preventScroll: true });
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        console.log('[UI] execCommand copy result:', success);
        
        if (success) {
          parent.postMessage({ pluginMessage: { type: 'copy-success' } }, '*');
          return;
        }
      } catch (err) {
        console.warn('[UI] execCommand copy failed:', err);
      }
      
      // 方法3: コードブロックを自動選択してユーザーにコピーを促す
      try {
        const codeBlock = document.querySelector('.code-block');
        if (codeBlock) {
          // コードブロック全体を選択
          const range = document.createRange();
          range.selectNodeContents(codeBlock);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          
          console.log('[UI] Code block selected for user copy - press Ctrl+C/Cmd+C');
          parent.postMessage({ pluginMessage: { type: 'copy-success' } }, '*');
        }
      } catch (err) {
        console.error('[UI] All copy methods failed:', err);
      }
    }
    
    function renderUI() {
      const content = document.getElementById('content');
      if (!currentStyles) {
        content.innerHTML = '<div class="message">Select a text element to export its style</div>';
        return;
      }
      
      const aliasValue = fontAliases[currentStyles.fontFamily] || '';
      
      content.innerHTML = \`
        <div class="code-container">
          <div class="code-block">\${currentSassCode}</div>
          <button class="copy-icon" onclick="console.log('[UI] Copy button clicked'); copyWithIcon(this)" title="Copy to clipboard">
            <svg viewBox="0 0 24 24">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
          </button>
        </div>
        
        <div class="section">
          <h3>Font Alias</h3>
          <div class="form-row">
            <label>\${currentStyles.fontFamily}:</label>
            <input type="text" id="aliasInput" value="\${aliasValue}" 
                   placeholder="e.g., $font-primary" 
                   oninput="updateAlias(this.value)">
          </div>
          <div id="aliasList"></div>
        </div>
        
        <div class="section">
          <h3>Settings</h3>
          <div class="form-row">
            <label>Base Font Size:</label>
            <input type="number" id="basePixelInput" value="\${settings.basePixelSize}"
                   placeholder="16" min="1" max="100"
                   oninput="updateBasePixelSize(this.value)">
            <span style="font-size: 12px; color: #666;">px (1rem = ?px)</span>
          </div>
          <div class="form-row">
            <label>
              <input type="checkbox" id="skipZeroLetterSpacingInput"
                     \${settings.skipZeroLetterSpacing ? 'checked' : ''}
                     onchange="updateSkipZeroLetterSpacing(this.checked)">
              Skip letter-spacing: 0
            </label>
          </div>
          <div class="form-row">
            <label>Storage Scope:</label>
            <select id="storageScopeSelect" onchange="changeStorageScope(this.value)"
                    style="flex: 1; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;">
              <option value="file" \${storageScope === 'file' ? 'selected' : ''}>💡 This file only</option>
              <option value="global" \${storageScope === 'global' ? 'selected' : ''}>📁 All files (default)</option>
            </select>
          </div>
          <div data-storage-desc style="font-size: 10px; color: #999; margin-top: 4px; line-height: 1.3; padding-left: 0;">
            \${storageScope === 'file' ? '💡 Settings saved with this Figma file' : '📁 Settings shared across all your files on this device'}
          </div>
        </div>
        
        <div class="section">
          <h3>Template</h3>
          <textarea id="templateInput" oninput="updateTemplate(this.value)" 
                    style="width: 100%; font-family: Monaco, monospace; font-size: 12px; resize: vertical;">\${settings.template}</textarea>
          <div style="font-size: 11px; color: #999; margin-top: 8px; line-height: 1.4;">
            <strong>Variables:</strong> $size(unit), $weight(unit), $family, $spacing(unit), $lineHeight(unit), $textAlign<br>
            <strong>Units:</strong><br>
            • size: px, rem, unitless<br>
            • weight: num, name (default)<br>
            • spacing: em, px, %, unitless<br>
            • lineHeight: %, unitless<br>
            <strong>Example:</strong> +text($size(rem), $weight(num), $family) or font-weight: $weight(num)
          </div>
        </div>
        
        <div class="section">
          <h3>Extracted Styles</h3>
          <div style="font-size: 12px; color: #666;">
            <div><strong>$size:</strong> \${currentStyles.fontSize}</div>
            <div><strong>$weight:</strong> \${currentStyles.fontWeight}</div>
            <div><strong>$family:</strong> \${currentStyles.fontFamily}</div>
            <div><strong>$spacing:</strong> \${currentStyles.letterSpacing}</div>
            <div><strong>$lineHeight:</strong> \${currentStyles.lineHeight}</div>
            <div><strong>$textAlign:</strong> \${currentStyles.textAlign}</div>
          </div>
        </div>
      \`;
      
      updateAliasList();
    }
    
    function updateAliasList() {
      const aliasList = document.getElementById('aliasList');
      if (!aliasList) return;
      
      const aliases = Object.entries(fontAliases);
      if (aliases.length === 0) {
        aliasList.innerHTML = '<div style="color: #999; font-size: 12px; margin-top: 8px;">No aliases defined</div>';
      } else {
        aliasList.innerHTML = aliases.map(([font, alias]) => 
          \`<div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 12px; color: #666; margin-top: 4px;">
            <span>\${font} → \${alias}</span>
            <button onclick="removeAlias('\${font}')" style="padding: 2px 8px; font-size: 10px; margin: 0;">Remove</button>
          </div>\`
        ).join('');
      }
    }
    
    function removeAlias(font) {
      delete fontAliases[font];
      parent.postMessage({
        pluginMessage: {
          type: 'save-aliases',
          aliases: fontAliases,
          scope: storageScope
        }
      }, '*');
      updateSassCode();
      updateAliasList();
    }

    function updateAlias(value) {
      const trimmedValue = value.trim();
      if (trimmedValue) {
        fontAliases[currentStyles.fontFamily] = trimmedValue;
      } else {
        delete fontAliases[currentStyles.fontFamily];
      }

      parent.postMessage({
        pluginMessage: {
          type: 'save-aliases',
          aliases: fontAliases,
          scope: storageScope
        }
      }, '*');
      updateSassCode();
      updateAliasList();
      // renderUI()を呼ばないことでフォーカスを維持
    }
    
    let templateTimer;
    function updateTemplate(value) {
      settings.template = value;
      updateSassCode();

      // 500ms後に保存（連続入力時は保存を遅延）
      clearTimeout(templateTimer);
      templateTimer = setTimeout(() => {
        parent.postMessage({
          pluginMessage: {
            type: 'save-settings',
            settings: settings,
            scope: storageScope
          }
        }, '*');
      }, 500);
    }

    function updateBasePixelSize(value) {
      const numValue = parseInt(value);
      console.log('updateBasePixelSize called with:', value, 'parsed:', numValue);
      if (numValue && numValue > 0) {
        settings.basePixelSize = numValue;
        console.log('settings.basePixelSize updated to:', settings.basePixelSize);
        updateSassCode();
        parent.postMessage({
          pluginMessage: {
            type: 'save-settings',
            settings: settings,
            scope: storageScope
          }
        }, '*');
        // renderUI()を呼ばないことでフォーカスを維持
      }
    }

    function updateSkipZeroLetterSpacing(checked) {
      settings.skipZeroLetterSpacing = checked;
      updateSassCode();
      parent.postMessage({
        pluginMessage: {
          type: 'save-settings',
          settings: settings,
          scope: storageScope
        }
      }, '*');
    }

    function changeStorageScope(newScope) {
      storageScope = newScope;
      parent.postMessage({
        pluginMessage: {
          type: 'change-storage-scope',
          scope: newScope
        }
      }, '*');
      // 説明文を更新
      updateStorageScopeDescription();
    }

    function updateStorageScopeDescription() {
      const descText = storageScope === 'file'
        ? '💡 Settings saved with this Figma file'
        : '📁 Settings shared across all your files on this device';
      const descElements = document.querySelectorAll('[data-storage-desc]');
      descElements.forEach(el => {
        el.textContent = descText;
      });
    }
    
    
    function addNewAlias() {
      const fontInput = document.getElementById('newFontInput');
      const aliasInput = document.getElementById('newAliasInput');
      
      if (fontInput && aliasInput) {
        const fontName = fontInput.value.trim();
        const aliasName = aliasInput.value.trim();
        
        if (fontName && aliasName) {
          fontAliases[fontName] = aliasName;
          parent.postMessage({ 
            pluginMessage: { 
              type: 'save-aliases',
              aliases: fontAliases
            } 
          }, '*');
          
          fontInput.value = '';
          aliasInput.value = '';
          
          updateSassCode();
          updateAliasList();
        }
      }
    }
    
    window.onmessage = function(event) {
      console.log('[UI] Message received:', event.data);
      const message = event.data.pluginMessage;
      
      if (message.type === 'no-selection' || message.type === 'no-text') {
        console.log('[UI] No valid selection');
        currentStyles = null;
        renderUI();
        return;
      }
      
      if (message.type === 'style-extracted') {
        console.log('[UI] Style extracted:', message.styles);
        currentStyles = message.styles;
        updateSassCode();
        // テンプレートまたはエイリアス入力中はUIを再構築しない（Base Font Size変更は除外）
        const templateInput = document.getElementById('templateInput');
        const aliasInput = document.getElementById('aliasInput');
        
        const isInputActive = (templateInput && templateInput === document.activeElement) ||
                             (aliasInput && aliasInput === document.activeElement);
        
        if (!isInputActive) {
          renderUI();
        }
      }
      
      if (message.type === 'aliases-loaded') {
        console.log('[UI] Aliases loaded:', message.aliases);
        fontAliases = message.aliases || {};
        storageScope = message.storageScope || 'file';
        if (currentStyles) {
          updateSassCode();
          renderUI();
        }
      }

      if (message.type === 'settings-loaded') {
        console.log('[UI] Settings loaded:', message.settings);
        settings = message.settings || settings;
        storageScope = message.storageScope || 'file';
        console.log('[UI] Current settings after load:', settings);
        if (currentStyles) {
          updateSassCode();
          renderUI();
        }
      }

      if (message.type === 'scope-changed') {
        console.log('[UI] Storage scope changed to:', message.scope);
        storageScope = message.scope;
      }
    };
  </script>
</body>
</html>
`;
// プラグイン初期化
console.log('Plugin initializing...');
figma.showUI(htmlContent, {
    width: 340,
    height: 720,
    themeColors: true,
    title: "Text Style Exporter"
});
// 設定を読み込んでから初期選択チェック
function initializePlugin() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('[Plugin] Initializing plugin...');
        yield loadSettings();
        console.log('[Plugin] Settings loaded:', pluginSettings);
        yield loadAliases();
        console.log('[Plugin] Aliases loaded:', pluginAliases);
        // UI側の準備が整うまで少し待機
        setTimeout(() => {
            console.log('[Plugin] Starting initial selection check');
            checkCurrentSelection();
        }, 200);
    });
}
initializePlugin();
// 選択変更監視
figma.on('selectionchange', () => {
    checkCurrentSelection();
});
// UIメッセージ処理
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Plugin received message:', msg);
    if (msg.type === 'ui-ready') {
        console.log('UI is ready');
    }
    if (msg.type === 'copy-success') {
        figma.notify('Copied to clipboard!');
    }
    if (msg.type === 'close') {
        figma.closePlugin();
    }
    if (msg.type === 'get-aliases') {
        yield loadAliases();
        figma.ui.postMessage({
            type: 'aliases-loaded',
            aliases: pluginAliases,
            storageScope: storageScope
        });
    }
    if (msg.type === 'save-aliases') {
        pluginAliases = msg.aliases;
        yield saveAliases(msg.scope || storageScope);
    }
    if (msg.type === 'get-settings') {
        yield loadSettings();
        figma.ui.postMessage({
            type: 'settings-loaded',
            settings: pluginSettings,
            storageScope: storageScope
        });
    }
    if (msg.type === 'save-settings') {
        pluginSettings = msg.settings;
        yield saveSettings(msg.scope || storageScope);
        // 設定変更時に選択中のテキストを再計算
        checkCurrentSelection();
    }
    if (msg.type === 'change-storage-scope') {
        const newScope = msg.scope;
        // 現在のスコープから新しいスコープにデータをコピー
        yield saveAliases(newScope);
        yield saveSettings(newScope);
        storageScope = newScope;
        figma.ui.postMessage({
            type: 'scope-changed',
            scope: newScope
        });
        figma.notify(`Storage scope changed to ${newScope === 'file' ? 'This file only' : 'All files'}`);
    }
});
console.log('Plugin initialized');
