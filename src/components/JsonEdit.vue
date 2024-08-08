<script setup>
import { Codemirror } from "vue-codemirror";
import { json as JsonMode } from "@codemirror/lang-json";
import { linter, lintGutter } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";


const json = defineModel("json");

const emits = defineEmits(["lintStatus"]);

const jsonLint = (view) => {
  const diagnostics = [];
  const text = view.state.doc.toString();
  try {
    JSON.parse(text);
    emits("lintStatus", true);
  } catch (e) {
    emits("lintStatus", false);
    const match = e.message.match(/position (\d+)/);
    if (match) {
      const pos = parseInt(match[1], 10);
      diagnostics.push({
        from: pos,
        to: pos + 1,
        severity: "error",
        message: e.message,
      });
    } else {
      diagnostics.push({
        from: 0,
        to: text.length,
        severity: "error",
        message: e.message,
      });
    }
  }
  return diagnostics;
};

const theme = EditorView.theme(
  {
    "&": {
      color: "#e06c75",
      backgroundColor: "#282c34",
      fontSize: "14px",
      fontFamily: "Consolas, Menlo, Monaco, 'Source Code Pro', 'Courier New', monospace",
    },
    // ".cm-activeLine": {
    //   backgroundColor: '#242424',
    // },
    ".cm-activeLineGutter": {
      backgroundColor: 'unset',
      color: "#fff",
    },
    ".cm-gutters": {
      color: '#495162',
      backgroundColor: '#282c34'
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "#9373EE",
      borderLeftWidth: "2px",
    },
    ".cm-selectionBackground": {
      backgroundColor: "#1a1a1a",
    },
    "&.cm-focused .cm-selectionBackground ": {
      background: '#1a1a1a !important',
    },
    "&.cm-focused": {
      outline: "none",
    },
    // 字符串颜色
    ".ͼe": {
      color: '#98c379'
    },
    //数字 布尔 null 颜色
    ".ͼd,.ͼc,.ͼb": {
      color: '#d19a66'
    },
    ".cm-lint-marker-error": {
      content: "''",
      display: 'block',
      backgroundColor: '#e51400',
      borderRadius: '50%',
      width: '10px',
      height: '10px',
    },
    ".cm-scroller::-webkit-scrollbar": {
      width: "8px",
      height: "8px",
    },
    ".cm-scroller::-webkit-scrollbar-track": {
      background: "#282c34",
    },
    ".cm-scroller::-webkit-scrollbar-thumb": {
      background: "#495162",
      borderRadius: "4px",
    },
    ".cm-scroller::-webkit-scrollbar-thumb:hover": {
      background: "#5c6370",
    },


  },
  { dark: true }
);



const extensions = [JsonMode(), lintGutter(), linter(jsonLint), theme,];
</script>
<template>
  <codemirror v-model="json" placeholder="编辑参数" :autofocus="true" :indent-with-tab="true" :tab-size="2"
    :extensions="extensions" />
</template>
