import type {CreativeAnimation} from '../src/creative';
export function buildStoryboard(value:unknown,assetCount?:number,brandIconAsset?:number):CreativeAnimation;
export function restyleStoryboard(plan:CreativeAnimation,assetCount?:number,brandIconAsset?:number,options?:{seed?:number;style?:string;energy?:string}):CreativeAnimation;
