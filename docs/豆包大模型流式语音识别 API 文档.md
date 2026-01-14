## 1. 服务简介与接入点

本服务通过 WebSocket 协议提供实时语音识别能力，在本项目中使用了“双向流式模式 (优化版)”以及“豆包流式语音识别模型2.0 小时版”。

### 1.1 接口地址

| 模式名称 | 接口地址 (WSS) | 说明 |
| --- | --- | --- |
| **双向流式模式** | `wss://openspeech.bytedance.com/api/v3/sauc/bigmodel` | 每输入一包音频返回一包结果，速度快，尽快返回字符。 |
| **流式输入模式** | `wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_nostream` | 输入音频 >15s 或发送结束包后返回结果，准确率更高。 |
| **双向流式模式 (优化版)** | `wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async` | **推荐**。仅当结果变化时返回数据包，优化了 RTF 和首尾字时延。支持二遍识别。 |

### 1.2 发包建议

* **音频分包大小**：建议 100ms ~ 200ms（双向流式模式建议固定 200ms 以获最优性能）。
* **发包间隔**：建议 100ms ~ 200ms。

---

## 2. 鉴权 (Authentication)

在 WebSocket 建立连接（Handshake）的 HTTP 请求头（Header）中需包含以下信息。

### 2.1 请求 Header

| Key | 说明 | 示例 |
| --- | --- | --- |
| `X-Api-App-Key` | 火山引擎控制台获取的 APP ID | `123456789` |
| `X-Api-Access-Key` | 火山引擎控制台获取的 Access Token | `your-access-key` |
| `X-Api-Resource-Id` | 资源 ID (区分计费模式) <br>

<br> **1.0版本**: `volc.bigasr.sauc.duration` (小时), `volc.bigasr.sauc.concurrent` (并发)<br>

<br> **2.0版本**: `volc.seedasr.sauc.duration` (小时), `volc.seedasr.sauc.concurrent` (并发) | `volc.bigasr.sauc.duration` |
| `X-Api-Connect-Id` | 客户端生成的唯一追踪 ID (UUID) | `67ee89ba-7050...` |

### 2.2 响应 Header

握手成功后，服务端返回：

* `X-Tt-Logid`: 服务端生成的唯一日志 ID (排错关键)。
* `X-Api-Connect-Id`: 回传客户端发送的 ID。

---

## 3. WebSocket 二进制协议详情

数据传输使用自定义二进制协议。整数类型字段均使用 **大端 (Big-Endian)** 表示。

### 3.1 协议帧结构

协议由 Header (4 Bytes) + Payload Size (4 Bytes) + Payload (N Bytes) 组成。

#### 3.1.1 Header (4 Bytes / 32 Bits)

| 位范围 (Bits) | 字段名称 | 长度 | 描述与取值 |
| --- | --- | --- | --- |
|  | Protocol Version | 4 bits | `0b0001` (Version 1) |
|  | Header Size | 4 bits | `0b0001` (4 Bytes) |
|  | **Message Type** | 4 bits | `0b0001`: Full Client Request (含配置参数)<br>

<br>`0b0010`: Audio Only Request (含音频数据)<br>

<br>`0b1001`: Full Server Response (含识别结果)<br>

<br>`0b1111`: Error Response (错误消息) |
|  | **Specific Flags** | 4 bits | `0b0000`: 无序列号<br>

<br>`0b0001`: 有正序序列号<br>

<br>`0b0010`: **最后一包(负包)**，无序列号<br>

<br>`0b0011`: **最后一包(负包)**，有负序序列号 |
|  | Serialization | 4 bits | `0b0000`: 无序列化 (Raw Bytes)<br>

<br>`0b0001`: JSON |
| [11:8] | Compression | 4 bits | `0b0000`: 无压缩<br>

<br>`0b0001`: Gzip |
| [7:0] | Reserved | 8 bits | 保留字段，通常为 `0x00` |

#### 3.1.2 Payload Size (4 Bytes)

* **类型**: Unsigned Int32 (Big-Endian)
* **含义**: Payload 经过压缩（如果有）后的字节长度。

#### 3.1.3 Payload

* 根据 Message Type 和 Serialization 决定内容（JSON 文本或音频二进制流）。

---

## 4. 交互流程

1. **建立连接**: Client 发起 WebSocket 握手（带鉴权 Header）。
2. **发送配置**: Client 发送第一帧 `Full Client Request` (Type: `0b0001`, Ser: JSON, Comp: Gzip)。Payload 为 JSON 配置。
3. **发送音频**: Client 循环发送 `Audio Only Request` (Type: `0b0010`, Ser: None, Comp: Gzip)。Payload 为音频数据块。
4. **接收响应**: Server 持续返回 `Full Server Response` (Type: `0b1001`, Ser: JSON)。
5. **结束发送**: Client 发送最后一包音频时，Header 中的 `Specific Flags` 需置为 `0b0010` 或 `0b0011`。

---

## 5. 请求参数 (Full Client Request Payload)

Payload 为 JSON 格式，主要包含以下层级：

### 5.1 User 对象 (用户信息)

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `uid` | string | 否 | 用户标识 (建议 IMEI/MAC) |
| `did` | string | 否 | 设备名称 |
| `platform` | string | 否 | 系统 (iOS/Android/Linux) |

### 5.2 Audio 对象 (音频配置) **[必填]**

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `format` | string | **是** | `pcm`, `wav`, `ogg`, `mp3` (PCM/WAV 需为 pcm_s16le) |
| `codec` | string | 否 | `raw` (默认, 代表 PCM), `opus` (ogg 必须用 opus) |
| `rate` | int | 否 | 采样率，目前仅支持 `16000` |
| `bits` | int | 否 | 位深，目前仅支持 `16` |
| `channel` | int | 否 | 声道，目前仅支持 `1` (mono) |
| `language` | string | 否 | **仅流式输入模式支持**。指定语言 (如 `en-US`, `ja-JP`, `de-DE` 等)。不填默认支持中/英/粤/沪/闽/川/陕。 |

### 5.3 Request 对象 (识别配置) **[必填]**

| 字段 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `model_name` | string | - | 必须固定为 `bigmodel` |
| `enable_nonstream` | bool | false | **二遍识别** (仅优化版支持)。结合流式快和非流式准的优点。开启后默认启用 VAD 分句。 |
| `enable_itn` | bool | true | 文本规范化 (如 "一九七零年" -> "1970年") |
| `enable_punc` | bool | true | 启用标点符号 |
| `enable_ddc` | bool | false | 语义顺滑 (去除停顿词、重复词) |
| `show_utterances` | bool | false | 输出详细分句、时间戳信息 |
| `result_type` | string | "full" | "full" (全量返回), "single" (增量返回) |
| `enable_accelerate_text` | bool | false | 首字加速 (可能降低准确率) |
| `accelerate_score` | int | 0 | 加速等级 [0-20] |
| `sensitive_words_filter` | string | - | 敏感词过滤配置 JSON 字符串 |

#### 5.3.1 高级功能与 VAD 参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `vad_segment_duration` | int | 语义切句最大静音阈值 (默认 3000ms) |
| `end_window_size` | int | **强制判停时间** (默认 800ms)。静音超此值直接判停输出 `definite=true`。 |
| `force_to_speech_time` | int | 强制语音时间 (推荐 1000ms)，小于此长度不判停。 |
| `show_speech_rate` | bool | 分句携带语速 (token/s) |
| `show_volume` | bool | 分句携带音量 (dB) |
| `enable_lid` | bool | **语种检测**。结果包含 `lid_lang` 标签 (如 `speech_en`, `singing_mand` 等) |
| `enable_emotion_detection` | bool | **情绪检测**。结果包含 `emotion` 标签 (angry/happy/sad/neutral/surprise) |
| `enable_gender_detection` | bool | **性别检测**。结果包含 `gender` 标签 (male/female) |
| `enable_poi_fc` | bool | 开启 POI 地点 Function Call 优化 |
| `enable_music_fc` | bool | 开启音乐 Function Call 优化 |

### 5.4 Corpus 对象 (上下文与热词)

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `context` | string | 热词或对话上下文 JSON。 |
| `boosting_table_id` | string | 热词表 ID |

#### Context 高级用法 (多模态与历史)

`context` 字段可传入 JSON 字符串：

1. **热词直传**: `{"hotwords":[{"word":"热词1"}]}`
2. **对话/视觉上下文** (豆包模型 2.0 支持图片):
```json
{
    "context_type": "dialog_ctx",
    "context_data": [
        {"text": "历史对话1"},
        {"image_url": "http://...png"}, // 支持 1 张 500k 以内图片
        {"text": "当前环境信息: 北京"}
    ]
}

```



---

## 6. 响应参数 (Full Server Response Payload)

Payload 为 JSON 格式：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `result` | list | 识别结果列表 (成功时返回) |
| `audio_info` | dict | 音频信息 (如 duration) |

### Result 结构详情

`result` 列表中的对象结构：
| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `text` | string | 当前音频的完整识别文本 |
| `utterances` | list | 分句详情 (开启 `show_utterances` 时返回) |

**Utterance 对象结构**:

* `text`: 分句文本
* `start_time`: 开始时间 (ms)
* `end_time`: 结束时间 (ms)
* `definite`: **bool** (关键)。`true` 表示该分句已锁定（判停），不会再变；`false` 表示流式中间结果。
* `words`: 字级详情 (含 `blank_duration` 等)。
* `additions`: 携带 lid, emotion, gender, volume 等扩展信息。

---

## 7. 错误处理 (Error Response)

当发生错误时，Message Type 为 `0b1111`。
Payload 结构：

* Header
* Error Code (4 Bytes, Big-Endian)
* Error Message Size (4 Bytes, Big-Endian)
* Error Message (UTF-8 String)

### 常见错误码

| 错误码 | 含义 | 说明 |
| --- | --- | --- |
| `20000000` | 成功 | - |
| `45000001` | 参数无效 | 缺失字段、格式错误、重复请求 |
| `45000002` | 空音频 | - |
| `45000081` | 等包超时 | - |
| `45000151` | 音频格式错误 | - |
| `55000031` | 服务器繁忙 | 服务过载 |

---

## 8. 请求示例 (JSON Payload)

```json
{
    "user": {
        "uid": "user_device_123"
    },
    "audio": {
        "format": "wav",
        "rate": 16000,
        "bits": 16,
        "channel": 1,
        "language": "zh-CN"
    },
    "request": {
        "model_name": "bigmodel",
        "enable_itn": true,
        "enable_punc": true,
        "show_utterances": true,
        "corpus": {
            "context": "{\"hotwords\":[{\"word\":\"字节跳动\"}]}"
        }
    }
}

```