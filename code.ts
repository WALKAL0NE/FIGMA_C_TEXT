// Figma Text Style Exporter Plugin

function pxToRem(px: number, basePixelSize: number = 16): string {
  const remValue = (px / basePixelSize).toFixed(3);
  return `${parseFloat(remValue)}rem`;
}

function getFontWeightString(weight: number): string {
  const weightMap: { [key: number]: string } = {
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

function letterSpacingToEm(letterSpacing: { value: number, unit: string }): string {
  if (letterSpacing.unit === 'PERCENT') {
    const emValue = `${(letterSpacing.value / 100).toFixed(2)}em`;
    console.log('[Plugin] letterSpacingToEm:', letterSpacing.value, '% ->', emValue);
    return emValue;
  }
  console.log('[Plugin] letterSpacingToEm: not PERCENT, returning 0em');
  return '0em';
}

function extractTextStyles(node: TextNode, basePixelSize: number = 16): any {
  const fontSize = node.fontSize as number;
  const fontWeight = node.fontWeight as number;
  const fontFamily = node.fontName as { family: string };
  const letterSpacing = node.letterSpacing;
  const lineHeight = node.lineHeight;
  const textAlign = node.textAlignHorizontal as any;
  
  let lineHeightValue = 1;
  if (lineHeight && lineHeight !== figma.mixed) {
    const lineHeightObj = lineHeight as any;
    if ('value' in lineHeightObj && 'unit' in lineHeightObj) {
      if (lineHeightObj.unit === 'PERCENT') {
        lineHeightValue = lineHeightObj.value / 100;
      } else if (lineHeightObj.unit === 'PIXELS') {
        lineHeightValue = lineHeightObj.value / fontSize;
      }
    } else if (typeof lineHeightObj === 'object' && 'value' in lineHeightObj) {
      lineHeightValue = lineHeightObj.value / fontSize;
    }
  }

  // テキスト配置の変換
  let textAlignValue = 'left';
  if (textAlign !== figma.mixed) {
    switch (textAlign) {
      case 'CENTER': textAlignValue = 'center'; break;
      case 'RIGHT': textAlignValue = 'right'; break;
      case 'JUSTIFIED': textAlignValue = 'justify'; break;
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
}

function checkCurrentSelection() {
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

  const textNodes = selection.filter(node => node.type === 'TEXT') as TextNode[];
  
  if (textNodes.length === 0) {
    console.log('[Plugin] No text nodes found');
    figma.ui.postMessage({
      type: 'no-text',
      message: 'Please select a text element'
    });
    return;
  }

  const textNode = textNodes[0];
  const styles = extractTextStyles(textNode, pluginSettings.basePixelSize);
  console.log('[Plugin] Text styles extracted:', styles);
  
  figma.ui.postMessage({
    type: 'style-extracted',
    styles: styles
  });
}

// プラグイン側でエイリアスと設定を管理
let pluginAliases: { [key: string]: string } = {};
let pluginSettings = {
  template: '+text($size(rem), $weight, $family)\nletter-spacing: $spacing(em)\nline-height: $lineHeight',
  basePixelSize: 16,
  skipZeroLetterSpacing: true
};

// ストレージ操作
async function loadAliases() {
  try {
    const saved = await figma.clientStorage.getAsync('fontAliases');
    if (saved) {
      pluginAliases = saved;
    }
  } catch (err) {
    console.error('Failed to load aliases:', err);
  }
}

async function saveAliases() {
  try {
    await figma.clientStorage.setAsync('fontAliases', pluginAliases);
  } catch (err) {
    console.error('Failed to save aliases:', err);
  }
}

async function loadSettings() {
  try {
    const saved = await figma.clientStorage.getAsync('pluginSettings');
    if (saved) {
      pluginSettings = saved;
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

async function saveSettings() {
  try {
    await figma.clientStorage.setAsync('pluginSettings', pluginSettings);
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
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
            value = styles.fontWeight;
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
        </div>
        
        <div class="section">
          <h3>Template</h3>
          <textarea id="templateInput" oninput="updateTemplate(this.value)" 
                    style="width: 100%; font-family: Monaco, monospace; font-size: 12px; resize: vertical;">\${settings.template}</textarea>
          <div style="font-size: 11px; color: #999; margin-top: 8px; line-height: 1.4;">
            <strong>Variables:</strong> $size(unit), $weight, $family, $spacing(unit), $lineHeight(unit), $textAlign<br>
            <strong>Units:</strong> px, rem, em, %, unitless<br>
            <strong>Example:</strong> +text($size(px), $weight, $family) or text-align: $textAlign
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
          aliases: fontAliases
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
          aliases: fontAliases
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
            settings: settings
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
            settings: settings
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
          settings: settings
        } 
      }, '*');
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
        if (currentStyles) {
          updateSassCode();
          renderUI();
        }
      }
      
      if (message.type === 'settings-loaded') {
        console.log('[UI] Settings loaded:', message.settings);
        settings = message.settings || settings;
        console.log('[UI] Current settings after load:', settings);
        if (currentStyles) {
          updateSassCode();
          renderUI();
        }
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
async function initializePlugin() {
  console.log('[Plugin] Initializing plugin...');
  await loadSettings();
  console.log('[Plugin] Settings loaded:', pluginSettings);
  await loadAliases();
  console.log('[Plugin] Aliases loaded:', pluginAliases);
  // UI側の準備が整うまで少し待機
  setTimeout(() => {
    console.log('[Plugin] Starting initial selection check');
    checkCurrentSelection();
  }, 200);
}

initializePlugin();

// 選択変更監視
figma.on('selectionchange', () => {
  checkCurrentSelection();
});

// UIメッセージ処理
figma.ui.onmessage = async msg => {
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
    await loadAliases();
    figma.ui.postMessage({
      type: 'aliases-loaded',
      aliases: pluginAliases
    });
  }
  
  if (msg.type === 'save-aliases') {
    pluginAliases = msg.aliases;
    await saveAliases();
  }
  
  if (msg.type === 'get-settings') {
    await loadSettings();
    figma.ui.postMessage({
      type: 'settings-loaded',
      settings: pluginSettings
    });
  }
  
  if (msg.type === 'save-settings') {
    pluginSettings = msg.settings;
    await saveSettings();
    // 設定変更時に選択中のテキストを再計算
    checkCurrentSelection();
  }
};

console.log('Plugin initialized');