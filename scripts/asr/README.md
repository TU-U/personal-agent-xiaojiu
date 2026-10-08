# 本地 ASR 样本核验

已接入网页上传/录制、本地转写任务、人工修订与总结。技术样本证据见执行记录；中文错词和自动说话人数仍有局限，不代表完整质量验收通过。

当前默认：faster-whisper large-v3-turbo（CPU int8、本地运行）做中英文转写；small仅保留为历史对照。sherpa-onnx + pyannote segmentation ONNX + 3D-Speaker 做匿名说话人分离。默认不使用云服务，不上传个人录音。GPU加速须另行验证，不依据显卡存在推定可用。

```bash
python3 -m venv .local-runtime/asr-venv
.local-runtime/asr-venv/bin/pip install -r scripts/asr/requirements.txt
.local-runtime/asr-venv/bin/python scripts/asr/prepare.py
.local-runtime/asr-venv/bin/python scripts/asr/probe.py .local-runtime/asr-models/0-four-speakers-zh.wav --language zh --output .local-runtime/asr-models/probe-zh.json
.local-runtime/asr-venv/bin/python scripts/asr/probe.py .local-runtime/asr-models/1-two-speakers-en.wav --language en --output .local-runtime/asr-models/probe-en.json
```

默认自动聚类说话人数；`--speakers N`仅供已知人数的对照试验，不能用强制指定正确人数的结果冒充自动分离成功。报告包含分段/词时间、分离时间段、耗时及峰值内存，仍须对照音频核查识别质量。试验结果不是用户转写数据。取消/版本/部分失败/编辑过期与网页录音已接入并有专项证据；实际中英文质量边界仍须单独说明。

公开资源来源：[faster-whisper](https://github.com/SYSTRAN/faster-whisper)、[模型卡](https://huggingface.co/Systran/faster-whisper-small)、[分离官方示例](https://github.com/k2-fsa/sherpa-onnx/blob/master/python-api-examples/offline-speaker-diarization.py)。下载模型和样本保存在项目.local-runtime内，manifest记录获取的revision和哈希。脚本不读取E盘录音，不修改系统Python。

首轮实测发现 small 中文识别和自动分离质量不足，继续试验更强模型：

```bash
.local-runtime/asr-venv/bin/python scripts/asr/prepare.py --model large-v3-turbo
.local-runtime/asr-venv/bin/python scripts/asr/probe.py .local-runtime/asr-models/0-four-speakers-zh.wav --language zh --model large-v3-turbo --threshold 0.7 --output .local-runtime/asr-models/probe-zh-turbo.json
```

`transcribe.py`为当前worker使用的JSON行协议入口，默认large-v3-turbo，仅加载本地文件；`--model small`可复现小模型试验。Node适配器位于`server/ai/local-asr.mjs`，通过`server/jobs/audio-jobs.mjs`接入业务API与后台队列。当前30分钟限制是内存保护上限，不代表已经验证30分钟识别质量。实际样本结果、剩余问题见`docs/20-development-progress.md`。

## 设置页独立能力探测

“设置与数据 → 能力状态”中的语音转写和说话人分离分别读取本地Python与模型文件配置，分别测试、保存结果，不使用文本模型连通结果代替。按钮调用 `scripts/asr/capability.py`，使用上面准备的公开英语样本前15秒，不读取用户录音、不下载模型。模型加载和音频解码与业务转写复用实现；缺少样本或依赖会报错，进程最多90秒后终止。结果含调用编号，可在AI日志查找。

转写返回非空文字、分离返回时间段只代表该样本运行成功，不代表中文识别或自动说话人数准确性达标。独立探测已于2026-10-08实际运行，见artifacts/audio-capability-check-20261008.json；网页录制到实际总结见artifacts/audio-live-flow-20261008.json。这两项不消除中文已知错词或自动人数误差。

2026-10-08只读复核：既有中文56.86秒结果含13个文字段、5个分离编号；英文16秒结果含4个文字段、2个分离编号；文字段时间均位于音频时长内。结果文件hash与限制汇总见 artifacts/audio-evidence-review-20261008.json。本次没有重新推理，不声明中文自动识别质量已经获用户接受。
