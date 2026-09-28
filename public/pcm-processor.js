class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Int16Array(2048);
    this.bufferSize = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];
    const pcm16 = new Int16Array(channelData.length);

    for (let i = 0; i < channelData.length; i++) {
      let s = Math.max(-1, Math.min(1, channelData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Send the chunk to the main thread
    this.port.postMessage(pcm16);

    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
