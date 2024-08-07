import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetUno,
  presetWebFonts,
  transformerDirectives,
  transformerVariantGroup
} from 'unocss'
import { presetScrollbar } from 'unocss-preset-scrollbar'


export default defineConfig({
  shortcuts: [],
  theme: {
    colors: {
      primary: '#9373EE',
      get: '#17B26A',
      post: '#EF6820',
      normal: '#344054',
      tip: '#f79009'
    }
  },
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons(),
    presetTypography(),
    presetWebFonts({
      fonts: {},
    }),
    presetScrollbar({
      scrollbarTrackColor: 'transparent',
      scrollbarThumbColor: '#eaecf0',
      scrollbarWidth: '5px',
    }),

  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
})