'use strict';
// to-objectivec — Convert JSON to Objective-C interface and implementation

function initToolOptions() {
  const el = document.getElementById('inputOptions');
  if (!el) return;
  el.innerHTML = `
    <span class="jt-options-label">生成选项</span>
    <div class="jt-options-row">
      <label class="jt-checkbox">
        <input type="checkbox" id="optUseNSNULL" checked>
        <span>使用 nullable (iOS 9+)</span>
      </label>
      <label class="jt-checkbox">
        <input type="checkbox" id="optGenerateImpl" checked>
        <span>生成实现文件</span>
      </label>
      <label class="jt-checkbox">
        <input type="checkbox" id="optUseFoundation">
        <span>添加 Foundation 导入</span>
      </label>
    </div>
    <div class="jt-options-row">
      <label class="jt-input-label">类名前缀:</label>
      <input type="text" id="optPrefix" value="" placeholder="可选" class="jt-input">
    </div>
  `;
}

function processJson() {
  var _gaStart = Date.now();
  if (typeof gaTrackToolUse === 'function') gaTrackToolUse('json-tool-to-objectivec');
  clearErrorPanel();
  const parsed = parseInput();
  if (parsed === null) return;

  const useNSNULL = document.getElementById('optUseNSNULL')?.checked ?? true;
  const generateImpl = document.getElementById('optGenerateImpl')?.checked ?? true;
  const useFoundation = document.getElementById('optUseFoundation')?.checked ?? false;
  const prefix = document.getElementById('optPrefix')?.value.trim() ?? '';

  try {
    const rootName = getClassName(prefix);
    const classes = [];

    function objType(v, isArray = false) {
      const nullable = v === null ? (useNSNULL ? 'nullable ' : '') : '';

      if (v === null) return useNSNULL ? 'NSString * _Nullable' : 'NSString *';
      if (typeof v === 'boolean') return `${nullable}NSNumber *`;
      if (typeof v === 'number') return Number.isInteger(v) ? `${nullable}NSNumber *` : `${nullable}NSNumber *`;
      if (typeof v === 'string') return `${nullable}NSString *`;

      return `${isNullish(v) ? 'NSString * _Nullable' : 'NSString *'}`;
    }

    function gen(obj, name, isRoot = false) {
      if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return;

      const properties = [];
      const implProperties = [];

      Object.entries(obj).forEach(([key, value]) => {
        const propName = toCamelCase(key);
        let type;

        if (Array.isArray(value) && value.length > 0) {
          if (typeof value[0] === 'object') {
            const nestedClassName = toPascalCase(key);
            gen(value[0], nestedClassName);
            type = `NSArray<${prefix}${nestedClassName} *> *`;
          } else {
            type = `NSArray *`;
          }
        } else if (typeof value === 'object' && value !== null) {
          const nestedClassName = toPascalCase(key);
          gen(value, nestedClassName);
          type = `${prefix}${nestedClassName} *`;
        } else {
          type = objType(value);
        }

        const nullability = isNullish(value) ? (useNSNULL ? ' _Nullable' : ' *') : ' *';
        const atomic = 'atomic';
        const strong = 'strong';

        properties.push(`@property (nonatomic, ${strong}) ${type}${propName};`);
        implProperties.push(`@synthesize ${propName};`);
      });

      const header = generateHeader(name, properties, useFoundation);
      const impl = generateImpl ? generateImplementation(name, implProperties) : '';

      if (isRoot) {
        classes.unshift(header, impl);
      } else {
        classes.push(header, impl);
      }
    }

    gen(Array.isArray(parsed) ? parsed[0] : parsed, rootName, true);

    const output = classes.filter(c => c).join('\n\n');
    setOutput(output, 'objc');
  if (typeof gaTrackProcessDone === 'function') gaTrackProcessDone('json-tool-to-objectivec', 1, Date.now() - _gaStart);

    const statsEl = document.getElementById('outputStats');
    if (statsEl) {
      const classCount = (output.match(/@interface/g) || []).length;
      statsEl.innerHTML = `<span class="jt-success-badge">✅ 生成 ${classCount} 个 Objective-C 类</span>`;
    }
  } catch (err) {
    showError('转换失败: ' + err.message);
  }
}

function generateHeader(className, properties, useFoundation) {
  const imports = useFoundation ? '#import <Foundation/Foundation.h>\n\n' : '';
  const headerGuard = `${className}_h`;

  return `${imports}#ifndef ${headerGuard}
#define ${header_guard}

@interface ${className} : NSObject

${properties.join('\n')}

@end
`;
}

function generateImplementation(className, synthesizeStatements) {
  return `#import "${className}.h"

@implementation ${className}

${synthesizeStatements.join('\n')}

@end`;
}

function isNullish(value) {
  return value === null || value === undefined;
}

function getClassName(prefix = '') {
  const defaultName = 'MyModel';
  let name = prompt('请输入根类名:', defaultName);
  if (!name || name.trim() === '') {
    name = defaultName;
  }
  return prefix + toPascalCase(name.trim());
}

function toPascalCase(str) {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, (c) => c.toUpperCase());
}

function toCamelCase(str) {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^(.)/, (c) => c.toLowerCase());
}

function showError(msg) {
  const panel = document.getElementById('errorPanel');
  if (panel) {
    panel.style.display = 'block';
    panel.innerHTML = `<div class="jt-error">${msg}</div>`;
  }
}