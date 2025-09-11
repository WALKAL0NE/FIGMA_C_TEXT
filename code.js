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
        return `${(letterSpacing.value / 100).toFixed(2)}em`;
    }
    return '0em';
}
function extractTextStyles(node, basePixelSize = 16) {
    const fontSize = node.fontSize;
    const fontWeight = node.fontWeight;
    const fontFamily = node.fontName;
    const letterSpacing = node.letterSpacing;
    const lineHeight = node.lineHeight;
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
        else if (typeof lineHeightObj === 'object' && 'value' in lineHeightObj) {
            lineHeightValue = lineHeightObj.value / fontSize;
        }
    }
    return {
        fontSize: pxToRem(fontSize, basePixelSize),
        fontWeight: getFontWeightString(fontWeight),
        fontFamily: fontFamily.family,
        letterSpacing: letterSpacing !== figma.mixed ? letterSpacingToEm(letterSpacing) : '0em',
        lineHeight: lineHeightValue.toFixed(2).replace(/\.?0+$/, '')
    };
}
function checkCurrentSelection() {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
        figma.ui.postMessage({
            type: 'no-selection',
            message: 'Please select a text element'
        });
        return;
    }
    const textNodes = selection.filter(node => node.type === 'TEXT');
    if (textNodes.length === 0) {
        figma.ui.postMessage({
            type: 'no-text',
            message: 'Please select a text element'
        });
        return;
    }
    const textNode = textNodes[0];
    const styles = extractTextStyles(textNode, pluginSettings.basePixelSize);
    figma.ui.postMessage({
        type: 'style-extracted',
        styles: styles
    });
}
// プラグイン側でエイリアスと設定を管理
let pluginAliases = {};
let pluginSettings = {
    template: '+text($size(rem), $weight, $family)\nletter-spacing: $spacing(em)\nline-height: $lineHeight(%)',
    basePixelSize: 16
};
// ストレージ操作
function loadAliases() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const saved = yield figma.clientStorage.getAsync('fontAliases');
            if (saved) {
                pluginAliases = saved;
            }
        }
        catch (err) {
            console.error('Failed to load aliases:', err);
        }
    });
}
function saveAliases() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield figma.clientStorage.setAsync('fontAliases', pluginAliases);
        }
        catch (err) {
            console.error('Failed to save aliases:', err);
        }
    });
}
function loadSettings() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const saved = yield figma.clientStorage.getAsync('pluginSettings');
            if (saved) {
                pluginSettings = saved;
            }
        }
        catch (err) {
            console.error('Failed to load settings:', err);
        }
    });
}
function saveSettings() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield figma.clientStorage.setAsync('pluginSettings', pluginSettings);
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
    h3 { margin: 0 0 1em 0; }
    .message { padding: 12px; background: #f5f5f5; border-radius: 4px; text-align: center; color: #666; margin-bottom: 16px; }
    .code-block {
      background: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 4px; padding: 12px;
      font-family: Monaco, monospace; font-size: 12px; white-space: pre; overflow-x: auto;
      margin-bottom: 16px; min-height: 60px;
    }
    button {
      background: #18a0fb; color: white; border: none; border-radius: 4px;
      padding: 8px 16px; font-size: 12px; cursor: pointer; margin: 4px;
    }
    button:hover { background: #0090e7; }
    .section { margin: 16px 0; padding: 12px; border: 1px solid #e0e0e0; border-radius: 4px; }
    .form-row { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
    input, textarea { flex: 1; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; }
    textarea { font-family: Monaco, monospace; min-height: 80px; }
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
      template: '+text($size(rem), $weight, $family)\\nletter-spacing: $spacing(em)\\nline-height: $lineHeight(%)',
      basePixelSize: 16
    };
    
    parent.postMessage({ pluginMessage: { type: 'ui-ready' } }, '*');
    parent.postMessage({ pluginMessage: { type: 'get-aliases' } }, '*');
    parent.postMessage({ pluginMessage: { type: 'get-settings' } }, '*');
    
    function updateSassCode() {
      if (!currentStyles) return;
      currentSassCode = applyTemplate(settings.template, currentStyles, fontAliases);
      const codeBlock = document.querySelector('.code-block');
      if (codeBlock) codeBlock.textContent = currentSassCode;
    }
    
    function parseTemplate(template) {
      const regex = /\\$(size|weight|family|spacing|lineHeight)(?:\\(([^)]+)\\))?/g;
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
            break;
          case 'lineHeight':
            value = convertLineHeight(styles.lineHeight, unit);
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
    
    function copyToClipboard() {
      const textarea = document.createElement('textarea');
      textarea.value = currentSassCode;
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      parent.postMessage({ pluginMessage: { type: 'copy-success' } }, '*');
    }
    
    function renderUI() {
      const content = document.getElementById('content');
      if (!currentStyles) {
        content.innerHTML = '<div class="message">Select a text element to export its style</div>';
        return;
      }
      
      const aliasValue = fontAliases[currentStyles.fontFamily] || '';
      
      content.innerHTML = \`
        <div class="code-block">\${currentSassCode}</div>
        <div>
          <button onclick="copyToClipboard()">Copy SASS Code</button>
          <button onclick="parent.postMessage({ pluginMessage: { type: 'close' } }, '*')">Close</button>
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
        </div>
        
        <div class="section">
          <h3>Settings Template</h3>
          <textarea id="templateInput" oninput="updateTemplate(this.value)" 
                    style="width: 100%; min-height: 120px; font-family: Monaco, monospace; font-size: 12px; resize: vertical;">\${settings.template}</textarea>
          <div style="font-size: 11px; color: #999; margin-top: 8px; line-height: 1.4;">
            <strong>Variables:</strong> $size(unit), $weight, $family, $spacing(unit), $lineHeight(unit)<br>
            <strong>Units:</strong> px, rem, em, %, unitless<br>
            <strong>Example:</strong> +text($size(px), $weight, $family) or font: $weight $size(rem) $family
          </div>
        </div>
        
        <div class="section">
          <h3>Extracted Styles</h3>
          <div style="font-size: 12px; color: #666;">
            <div><strong>Font Size:</strong> \${currentStyles.fontSize}</div>
            <div><strong>Font Weight:</strong> \${currentStyles.fontWeight}</div>
            <div><strong>Font Family:</strong> \${currentStyles.fontFamily}</div>
            <div><strong>Letter Spacing:</strong> \${currentStyles.letterSpacing}</div>
            <div><strong>Line Height:</strong> \${currentStyles.lineHeight}</div>
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
    }
    
    function updateTemplate(value) {
      settings.template = value;
      updateSassCode();
      parent.postMessage({ 
        pluginMessage: { 
          type: 'save-settings',
          settings: settings
        } 
      }, '*');
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
      }
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
      console.log('Message received:', event.data);
      const message = event.data.pluginMessage;
      
      if (message.type === 'no-selection' || message.type === 'no-text') {
        currentStyles = null;
        renderUI();
        return;
      }
      
      if (message.type === 'style-extracted') {
        currentStyles = message.styles;
        updateSassCode();
        renderUI();
      }
      
      if (message.type === 'aliases-loaded') {
        fontAliases = message.aliases || {};
        if (currentStyles) {
          updateSassCode();
          renderUI();
        }
      }
      
      if (message.type === 'settings-loaded') {
        settings = message.settings || settings;
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
// 初期選択チェック
checkCurrentSelection();
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
            aliases: pluginAliases
        });
    }
    if (msg.type === 'save-aliases') {
        pluginAliases = msg.aliases;
        yield saveAliases();
    }
    if (msg.type === 'get-settings') {
        yield loadSettings();
        figma.ui.postMessage({
            type: 'settings-loaded',
            settings: pluginSettings
        });
    }
    if (msg.type === 'save-settings') {
        pluginSettings = msg.settings;
        yield saveSettings();
        // 設定変更時に選択中のテキストを再計算
        checkCurrentSelection();
    }
});
console.log('Plugin initialized');
