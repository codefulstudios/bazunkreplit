import {designContrast,type DesignPalette} from './design-palette';
export function normalizeHex(value:unknown){if(typeof value!=='string')return null;const v=value.toLowerCase();return /^#[0-9a-f]{3}$/.test(v)?'#'+v.slice(1).split('').map(x=>x+x).join(''):/^#[0-9a-f]{6}$/.test(v)?v:null}
export function readableText(foreground:string,background:string){return designContrast(foreground,background)>=4.5?foreground:designContrast('#ffffff',background)>=4.5?'#ffffff':'#111111'}
export function themeBackground(value:unknown,p:DesignPalette){
 const hex=normalizeHex(value);if(!hex)return value;
 if(['#1559d6','#175cd3','#f26b21'].includes(hex))return p.action;
 if(['#f4f7fc','#f3f6fc'].includes(hex))return p.background;
 if(['#ffffff','#17253c','#102a56','#172442','#0d1829'].includes(hex))return p.surface;
 return p.field;
}
