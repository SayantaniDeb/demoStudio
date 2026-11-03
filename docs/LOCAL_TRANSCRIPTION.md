# Local transcription research

The implemented File studio uses the existing Groq caption endpoint. It does not claim to run speech recognition locally. Uploading/previewing a file and MP3/WAV conversion do not call the caption service; generating captions sends decoded audio to the existing endpoint.

## Browser option: Transformers.js + Whisper

[Transformers.js](https://huggingface.co/docs/transformers.js/main/en/index) supports automatic speech recognition in the browser using ONNX Runtime. [Its WebGPU guide](https://huggingface.co/docs/transformers.js/guides/webgpu) includes a Whisper example and notes that GPU support varies by browser. WebAssembly provides another execution path.

Recommendation: prototype quantized multilingual Whisper Tiny in a dedicated worker, with Whisper Base as an optional quality choice. This is a product recommendation, not a measured performance result. Download model files on explicit opt-in, show progress, cache where supported, and keep inference off the UI thread. Resample audio to the model's expected rate, request segment timestamps, then map results into the existing editable Caption schema. Benchmark long files, accents and languages on Safari and Chrome before release. Do not silently fall back to cloud processing.

The local engine would need a model download before first use. Cache availability, memory, speed and transcription quality depend on device/browser/model. No local model is installed by the current change.

## Native / alternative browser option: whisper.cpp

[whisper.cpp](https://github.com/ggml-org/whisper.cpp) is another local inference implementation. Its [official WASM example](https://github.com/ggml-org/whisper.cpp/tree/master/examples/whisper.wasm) runs Whisper in the browser. A native integration is a separate implementation path for the Mac app.

## Cloud option currently implemented

[Groq speech-to-text](https://console.groq.com/docs/speech-to-text) provides Whisper-based transcription. Existing code decodes/resamples audio, sends it in bounded chunks, and converts returned timed segments to editable captions. Groq requires connectivity and configured service credentials. It is separate from xAI Grok.

## Exports

File studio currently supports editable SRT, WebVTT and plain transcript downloads; captioned-video export using the browser's available MediaRecorder format; and actual MP3/WAV audio encoding. Audio conversion is local. MP3 encoding runs in a worker. Video export is real-time and codec support varies by browser.
