import express from "express"
import fs from "fs"
import path from "path"

const app = express()
app.use(express.json({ limit: "10mb" }))

const PORT = process.env.PORT || 3000
const TARGET = process.env.OLLAMA_URL || "http://localhost:11434"
const LOG_FILE = process.env.LOG_FILE || path.join(process.cwd(), "llm-logs-proxy.log")

const REASONING_START = "\n<Reasoning>\n"
const REASONING_END = "\n</Reasoning>\n"
const CONTENT_START = "\n<Content>\n"
const CONTENT_END = "\n</Content>\n"
const RAW_PREFIX = "Raw line sample : "

// log stream (ordre garanti)
const logStream = fs.createWriteStream(LOG_FILE, { flags: "a" })
function log(line) {
  logStream.write(line)
}

app.use(async (req, res) => {
  try {
    let reasoningBuffer = ""
    let reasoningSample = null
    let inReasoning = false

    let contentBuffer = ""
    let contentSample = null
    let inContent = false

    // =========================
    // HELPERS
    // =========================

    function flushReasoningChunk() {
      if (inReasoning && reasoningBuffer.length > 0) {
        log(reasoningBuffer)
        reasoningBuffer = ""
      }
    }

    function flushReasoning() {
      if (inReasoning) {
        flushReasoningChunk()
        log(REASONING_END)
      }
      reasoningBuffer = ""
      reasoningSample = null
      inReasoning = false
    }

    function flushContentChunk() {
      if (inContent && contentBuffer.length > 0) {
        log(contentBuffer)
        contentBuffer = ""
      }
    }

    function flushContent() {
      if (inContent) {
        flushContentChunk()
        log(CONTENT_END)
      }
      contentBuffer = ""
      contentSample = null
      inContent = false
    }

    function logProcessed(line) {
      try {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim()
          if (jsonStr === "[DONE]") {
            flushReasoning()
            flushContent()
            log(line)
            return
          }

          const json = JSON.parse(jsonStr)
          const delta = json?.choices?.[0]?.delta
          const reasoning = delta?.reasoning
          const content = delta?.content

          // ===== REASONING =====
          if (reasoning) {
            flushContent()

            if (!inReasoning) {
              inReasoning = true
              reasoningSample = line
              log(REASONING_START)
              log(RAW_PREFIX + reasoningSample + "\n")
            }
            reasoningBuffer += reasoning
            if (
              reasoning.includes("\n") ||
              reasoning.includes(".") ||
              reasoning.includes("?") ||
              reasoning.includes("!") ||
              reasoningBuffer.length > 200
            ) {
              flushReasoningChunk()
            }
            return
          }

          // ===== CONTENT =====
          if (content) {
            flushReasoning()

            if (!inContent) {
              inContent = true
              contentSample = line
              log(CONTENT_START)
              log(RAW_PREFIX + contentSample + "\n")
            }
            contentBuffer += content
            if (
              content.includes("\n") ||
              content.includes(".") ||
              content.includes("?") ||
              content.includes("!") ||
              contentBuffer.length > 200
            ) {
              flushContentChunk()
            }
            return
          }

          // ===== OTHER =====
          flushReasoning()
          flushContent()
          log(line + "\n")
          return
        }
      } catch (e) {
        flushReasoning()
        flushContent()
      }
      log(line)
    }

    const url = `${TARGET}${req.originalUrl}`

    log("\n------CLIENT------\n")
    log(`${req.method} ${req.originalUrl}\n`)

    if (req.body && Object.keys(req.body).length > 0) {
      log(JSON.stringify(req.body))
    }

    const response = await fetch(url, {
      method: req.method,
      headers: {
        "Content-Type": "application/json"
      },
      body: ["POST", "PUT", "PATCH"].includes(req.method)
        ? JSON.stringify(req.body)
        : undefined
    })

    res.status(response.status)
    response.headers.forEach((value, key) => {
      res.setHeader(key, value)
    })

    if (response.body) {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      log("\n------OLLAMA------\n")

      // 🔥 SSE Buffer
      let sseBuffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        sseBuffer += chunk

        let lines = sseBuffer.split("\n")

        sseBuffer = lines.pop()

        for (const line of lines) {
          if (!line.trim()) continue
          logProcessed(line)
        }

        // ⚠️ forward intact
        res.write(chunk)
      }
      res.end()
    } else {
      res.end()
    }
  } catch (err) {
    console.error(err)
    res.status(500).send("Proxy error")
  }
})

app.listen(PORT, () => {
  console.log(`Proxy running on http://localhost:${PORT}`)
  console.log(`Target: ${TARGET}`)
  console.log(`Logs: ${LOG_FILE}`)
})
