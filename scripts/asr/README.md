# 本地 ASR 样本核验

当前为 REC-P07 技术试验，尚未接网页或声称质量验收通过。

候选组合：faster-whisper small（CPU int8、4线程）做中英文转写；sherpa-onnx + pyannote segmentation ONNX + 3D-Speaker 做匿名说话人分离。默认不使用云服务，不上传个人录音。GPU加速须另行验证，不依据显卡存在推定可用。

```bash
python3 -m venv .local-runtime/asr-venv
.local-runtime/asr-venv/bin/pip install -r scripts/asr/requirements.txt
.local-runtime/asr-venv/bin/python scripts/asr/prepare.py
.local-runtime/asr-venv/bin/python scripts/asr/probe.py .local-runtime/asr-models/0-four-speakers-zh.wav --language zh --output .local-runtime/asr-models/probe-zh.json
.local-runtime/asr-venv/bin/python scripts/asr/probe.py .local-runtime/asr-models/1-two-speakers-en.wav --language en --output .local-runtime/asr-models/probe-en.json
```

默认自动聚类说话人数；`--speakers N`仅供已知人数的对照试验，不能用强制指定正确人数的结果冒充自动分离成功。报告包含分段/词时间、分离时间段、耗时及峰值内存，仍须对照音频核查识别质量。试验结果不是用户转写数据；未来业务接入仍需取消/版本/部分失败/时长上限/编辑过期及网页录音验收。

公开资源来源：[faster-whisper](https://github.com/SYSTRAN/faster-whisper)、[模型卡](https://huggingface.co/Systran/faster-whisper-small)、[分离官方示例](https://github.com/k2-fsa/sherpa-onnx/blob/master/python-api-examples/offline-speaker-diarization.py)。下载模型和样本保存在项目.local-runtime内，manifest记录获取的revision和哈希。脚本不读取E盘录音，不修改系统Python。

首轮实测发现 small 中文识别和自动分离质量不足，继续试验更强模型：

```bash
.local-runtime/asr-venv/bin/python scripts/asr/prepare.py --model large-v3-turbo
.local-runtime/asr-venv/bin/python scripts/asr/probe.py .local-runtime/asr-models/0-four-speakers-zh.wav --language zh --model large-v3-turbo --threshold 0.7 --output .local-runtime/asr-models/probe-zh-turbo.json
```

`transcribe.py`为后续worker使用的JSON行协议原型，默认large-v3-turbo，仅加载本地文件；`--model small`可复现小模型试验。Node适配器位于`server/local-asr.mjs`，尚未挂入业务API。当前30分钟限制是内存保护上限，不代表已经验证30分钟识别质量。实际样本结果、剩余问题见`docs/20-development-progress.md`。
