<p align="center">
  <img src="resources/icon.png" alt="OmniOwl" width="128" />
</p>

<h1 align="center">OmniOwl</h1>

<p align="center">Windows 系統音訊錄音工具，支援離線語音轉錄與翻譯。</p>

## 功能

- **系統音訊錄製** — 透過 WASAPI loopback 擷取桌面音訊，儲存為 M4A (AAC 192k)
- **語音轉錄** — 使用 Whisper (whisper.cpp) 離線轉錄，支援中/英/日/韓語及自動偵測
- **重新轉錄** — 可切換語言後對已轉錄的錄音重新轉錄
- **翻譯** — 透過本地 Ollama 將轉錄文字翻譯為繁體中文
- **錄音管理** — 播放、重新命名、刪除、匯出錄音
- **音量指示器** — 即時顯示錄音音量
- **加密儲存** — 可選的 AES-256-GCM 加密

## 技術架構

| 層級 | 技術 |
|------|------|
| 框架 | Electron + electron-vite |
| 前端 | React + TypeScript + Tailwind CSS |
| 狀態管理 | Zustand |
| 音訊編碼 | ffmpeg-static (WebM → M4A) |
| 語音辨識 | @fugood/whisper.node (whisper.cpp) |
| 翻譯 | Ollama (本地 LLM) |
| 資料庫 | sql.js (純 JS SQLite) |

## 安裝與開發

```bash
# 安裝依賴
npm install

# 開發模式
npm run dev

# 建置
npm run build

# 打包安裝檔 (Windows)
npx electron-builder --win
```

安裝檔輸出至 `dist/OmniOwl Setup 1.0.0.exe`。

## 使用前準備

### Whisper 模型

語音轉錄需要下載 GGML 模型檔案：

1. 至 [ggerganov/whisper.cpp (Hugging Face)](https://huggingface.co/ggerganov/whisper.cpp/tree/main) 下載模型
2. 開啟 Settings → Whisper Model File → Browse 選擇下載的 `.bin` 檔案

| 模型 | 大小 | 說明 |
|------|------|------|
| `ggml-base.bin` | ~142 MB | **英文推薦**，速度快、準確度佳 |
| `ggml-medium.bin` | ~1.5 GB | **中文推薦** |
| `ggml-large-v3.bin` | ~3 GB | 最佳品質，速度較慢 |

### Ollama（翻譯功能）

翻譯功能需要本地執行 Ollama：

1. 安裝 [Ollama](https://ollama.com)
2. 下載模型：`ollama pull gemma3:4b`
3. 確保 Ollama 在 `localhost:11434` 運行
4. Settings 中可自訂模型名稱

## 專案結構

```
src/
├── main/                    # Electron 主程序
│   ├── index.ts             # 主程序入口
│   ├── ipc.ts               # IPC 處理器
│   └── services/
│       ├── AudioCaptureService.ts   # ffmpeg 轉檔 + 檔案管理
│       ├── StorageService.ts        # sql.js 資料庫
│       └── WhisperService.ts        # Whisper 語音辨識
├── preload/
│   ├── index.ts             # 主視窗 preload (contextBridge)
│   └── transcript.ts        # 轉錄視窗 preload
├── renderer/src/
│   ├── App.tsx              # 主頁面
│   ├── components/
│   │   ├── RecordingControls.tsx    # 錄音按鈕 + 計時器 + 音量指示
│   │   ├── SessionList.tsx          # 錄音列表
│   │   ├── Settings.tsx             # 設定面板
│   │   └── TranscriptWindow.tsx     # 轉錄結果視窗
│   ├── hooks/
│   │   ├── useRecording.ts          # 系統音訊擷取 + MediaRecorder
│   │   └── useSessions.ts           # Session CRUD
│   └── store/
│       └── useStore.ts              # Zustand store
└── shared/
    ├── ipc.ts               # IPC channel 常數
    └── types.ts             # 共用型別定義
```

## License

MIT
