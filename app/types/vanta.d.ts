/**
 * Vanta 各效果的公共类型。
 * 注意：这里不能出现顶层 import/export，否则接口不再是全局声明，
 * 下面的 declare module 就引用不到它们了。
 */
interface VantaEffectOptions {
  el: HTMLElement
  THREE: unknown
  mouseControls?: boolean
  touchControls?: boolean
  gyroControls?: boolean
  minHeight?: number
  minWidth?: number
  scale?: number
  scaleMobile?: number
  color?: number
  color2?: number
  backgroundColor?: number
  backgroundAlpha?: number
  points?: number
  maxDistance?: number
  spacing?: number
  showDots?: boolean
  /** FOG / WAVES 等效果的专有参数 */
  [key: string]: unknown
}

interface VantaEffectInstance {
  destroy: () => void
  setOptions?: (options: Partial<VantaEffectOptions>) => void
}

declare module 'vanta/dist/vanta.net.min.js' {
  const factory: (options: VantaEffectOptions) => VantaEffectInstance
  export default factory
}

declare module 'vanta/dist/vanta.dots.min.js' {
  const factory: (options: VantaEffectOptions) => VantaEffectInstance
  export default factory
}

declare module 'vanta/dist/vanta.fog.min.js' {
  const factory: (options: VantaEffectOptions) => VantaEffectInstance
  export default factory
}

declare module 'vanta/dist/vanta.waves.min.js' {
  const factory: (options: VantaEffectOptions) => VantaEffectInstance
  export default factory
}
