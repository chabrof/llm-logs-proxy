# LLM Transparent Proxy (Ollama / OpenAI-compatible)

A minimal, transparent proxy for LLM APIs (Ollama / OpenAI-compatible) with real-time logging and structured parsing of reasoning and content streams.

## ✨ Features

* 🔁 **100% transparent proxy** (no transformation of requests/responses)
* 📡 **Streaming support (SSE)**
* 🧠 **Reasoning extraction** (`<Reasoning> ... </Reasoning>`)
* 💬 **Content extraction** (`<Content> ... </Content>`)
* 🧾 **Readable logs with raw samples**
* ⚡ **Real-time logging (tail -f friendly)**
* 🧩 Works with tools like OpenCode, Continue, or any OpenAI-compatible client

---

## 📦 Installation

```bash
git clone https://github.com/chabrof/llm-logs-proxy.git
cd llm-logs-proxy
npm install
```

---

## 🚀 Usage

```bash
node server.js
```

By default:

* Proxy runs on: `http://localhost:3000`
* Target (Ollama): `http://localhost:11434`
* Logs: `./llm-logs-proxy.log`

---

## ⚙️ Configuration

You can override defaults using environment variables:

```bash
PORT=3000
OLLAMA_URL=http://localhost:11434
LOG_FILE=./llm-proxy.log
```

Example:

```bash
PORT=4000 OLLAMA_URL=http://192.168.1.10:11434 node server.js
```

---

## 🔌 How it works

The proxy forwards all requests to the target LLM API **without modification**.

```text
Client (OpenCode)
        ↓
   Proxy (this project)
        ↓
   Ollama / LLM
```

It only:

* logs incoming requests (`------CLIENT------`)
* logs outgoing responses (`------OLLAMA------`)
* parses streaming chunks for readability

---

## 🧠 Log Format

### Example output:

```text
------CLIENT------
POST /v1/chat/completions
{ ... }

------OLLAMA------

<Reasoning>
Raw line sample : data: {...}
I should check if the input is valid.
Then proceed accordingly.
</Reasoning>

<Content>
Raw line sample : data: {...}
Hello! How can I help you today?
</Content>
```

---

## 🔍 Parsing Details

The proxy detects SSE chunks like:

```text
data: { "choices": [{ "delta": { "reasoning": "..." } }] }
```

and reconstructs:

* reasoning stream → `<Reasoning>`
* assistant output → `<Content>`

It uses a **buffered SSE parser** to avoid broken JSON from chunk boundaries.

---

## ⚠️ Disclaimer

This project:

* has only been tested with **OpenCode + Ollama (Qwen models)**
* **may work with other tools or models**, but this is **not guaranteed**
* is provided **as-is**, without any warranty

This tool is intended **for educational, learning, and research purposes only**.

🚫 It is **not designed for production use**, and should not be relied upon in production environments.

---

## 🧪 Use Cases

* Debug LLM behavior
* Inspect agent/tool interactions
* Analyze reasoning vs output
* Monitor prompt engineering effects
* Build custom LLM tooling

---

## 🛠️ Compatible With

* OpenCode (tested)
* VSCode copilot
* Continue.dev
* Any OpenAI-compatible client (best-effort)

---

## 📈 Future Improvements

* Token counting
* Latency metrics
* Loop detection (agent stuck detection)
* Full SSE event parsing
* Structured JSON export

---

## 📄 License

MIT

---

## 🙌 Contributing

Feel free to open issues or submit PRs!

---

## 💡 Author Notes

This tool was built to better understand how LLMs behave under real-world agent frameworks, especially with streaming, reasoning, and multi-request workflows.

---
