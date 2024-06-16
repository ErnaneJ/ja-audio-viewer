class AudioViewer {
  FFT_SIZES = [256, 512, 1024, 2048, 4096, 8192, 16384]
  
  constructor() {
    this.#getDOMElements();

    [this.width, this.height] = this.#getCanvasSize();

    this.canvasElement.width = this.width;
    this.canvasElement.height = this.height;
    this.canvasContext = this.canvasElement.getContext('2d');

    this.file = null;
    this.audioAnalyser = null;
    this.audioData = null;
    this.audioSource = null;

    // configurable paramiters

    this.fftSize = 256;
    this.redComponent = 150;
    this.greenComponent = 175;
    this.blueComponent = 200;

    this.#addEventListeners();
  }

  onFileChange(event) {
    const files = event.target.files;
    this.file = files[0];

    this.audioElement.src = URL.createObjectURL(this.file);
    this.audioElement.load();
    this.audioElement.play();

    this.#captureAudioData();
    this.#renderFrame();
  };

  #getDOMElements(){
    this.contentContainer = document.getElementById('content');
    this.audioElement = document.getElementById('audio');
    this.fileElement = document.getElementById('audioFile');
    this.canvasElement = document.getElementById('canvas');

    this.currentTimeElement = document.getElementById('currentTime');
    this.durationElement = document.getElementById('duration');
    this.volumeElement = document.getElementById('volume');
    this.averageFrequencyElement = document.getElementById('averageFrequency');
    this.maxFrequencyElement = document.getElementById('maxFrequency');
    this.fftSizeElement = document.getElementById('fftSize');
    this.frequencyBinCountElement = document.getElementById('frequencyBinCount');
    this.statusElement = document.getElementById('status');
    this.fileNameElement = document.getElementById('fileName');
    this.sampleRateElement = document.getElementById('sampleRate');
    this.frequencyIntervalElement = document.getElementById('frequencyInterval');
    this.redInput = document.getElementById('redInput');
    this.greenInput = document.getElementById('greenInput');
    this.blueInput = document.getElementById('blueInput');
  }

  #addEventListeners() {
    this.fftSizeElement.addEventListener('change', (event) => {
      this.fftSize = parseInt(event.target.value);
      this.#captureAudioData();
    });
    this.redInput.value = this.redComponent;
    this.redInput.addEventListener('change', (event) => this.redComponent = parseInt(event.target.value));
    this.greenInput.value = this.greenComponent;
    this.greenInput.addEventListener('change', (event) => this.greenComponent = parseInt(event.target.value));
    this.blueInput.value = this.blueComponent;
    this.blueInput.addEventListener('change', (event) => this.blueComponent = parseInt(event.target.value));

    this.fileElement.addEventListener('change', this.onFileChange.bind(this));
    this.audioElement.addEventListener('timeupdate', this.#updateAudioInfo.bind(this));
    this.audioElement.addEventListener('play', () => { this.statusElement.textContent = 'Status: Playing'; });
    this.audioElement.addEventListener('pause', () => { this.statusElement.textContent = 'Status: Paused'; });
    this.audioElement.addEventListener('ended', () => { this.statusElement.textContent = 'Status: Ended'; });
  }

  #updateAudioInfo() {
    this.currentTimeElement.textContent = `Current Time: ${Math.floor(this.audioElement.currentTime / 60)}:${Math.floor(this.audioElement.currentTime % 60)}`;
    this.durationElement.textContent = `Duration: ${Math.floor(this.audioElement.duration / 60)}:${Math.floor(this.audioElement.duration % 60)}`;
    this.volumeElement.textContent = `Volume: ${(this.audioElement.volume * 100).toFixed(2)}%`;
    this.fileNameElement.textContent = `File Name: ${this.file.name}`;
    this.sampleRateElement.textContent = `Sample Rate: ${this.audioContext.sampleRate} Hz`;
    this.averageFrequencyElement.textContent = `Average Frequency: ${(this.audioData.reduce((acc, val) => acc + val, 0) / this.audioData.length).toFixed(2)} Hz`;
    this.maxFrequencyElement.textContent = `Max Frequency: ${Math.max(...this.audioData)} Hz`;
  }

  #captureAudioData() {
    if(!this.audioContext) this.audioContext = new AudioContext();
    if(!this.audioSource)  this.audioSource = this.audioContext.createMediaElementSource(this.audioElement);
    this.audioAnalyser = this.audioContext.createAnalyser();

    this.audioSource.connect(this.audioAnalyser);
    this.audioAnalyser.connect(this.audioContext.destination);

    this.audioAnalyser.fftSize = this.fftSize; // 256, 512, 1024, 2048, 4096, 8192, 16384

    const bufferLength = this.audioAnalyser.frequencyBinCount;
    this.audioData = new Uint8Array(bufferLength);

    this.sampleRateElement.textContent = `Sample Rate: ${this.audioContext.sampleRate} Hz`;
    this.frequencyBinCountElement.textContent = `Frequency Bin Count: ${this.audioAnalyser.frequencyBinCount}`;

    const nyquist = this.audioContext.sampleRate / 2;
    const frequencyInterval = nyquist / this.audioAnalyser.frequencyBinCount;
    this.frequencyIntervalElement.textContent = `Frequency Interval: ${frequencyInterval.toFixed(2)} Hz`;
  }

  #getCanvasSize() {
    const contentBoundingClient = this.contentContainer.getBoundingClientRect();
    return [contentBoundingClient.width, contentBoundingClient.height];
  }

  #renderFrame() {
    requestAnimationFrame(this.#renderFrame.bind(this));

    let x = 0;

    this.audioAnalyser.getByteFrequencyData(this.audioData);

    this.canvasContext.fillStyle = "#ddd";
    this.canvasContext.fillRect(0, 0, this.width, this.height);

    const min = Math.min(...this.audioData);
    const max = Math.max(...this.audioData);
    const normalize = (value) => (value - min) / (max - min) * 100;

    let data = this.audioData.map(normalize);
        data = [...data.reverse(), ...data.reverse()];

    const barCount = data.length;
    const barWidth = this.width / barCount;
    for (var i = 0; i < barCount; i++) {
      if(!data[i]) data[i] = .5;
      const barHeight = (this.height * 2 / 3) * (data[i] / 100);

      var r = this.redComponent * (data[i] / 100);
      var g = this.greenComponent * (data[i] / 100);
      var b = this.blueComponent * (data[i] / 100);

      this.canvasContext.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
      this.canvasContext.fillRect(x - 2, this.height - barHeight, barWidth + 2, barHeight);

      x += barWidth;
    }
  }
}