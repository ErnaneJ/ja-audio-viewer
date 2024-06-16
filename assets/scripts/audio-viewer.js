class AudioViewer {
  constructor() {
    this.#getDOMElements();
    this.#getCanvasInfo();

    this.file = null;
    this.audioAnalyser = null;
    this.audioData = null;
    this.audioSource = null;

    this.fftSize = 256;
    this.filter = null;

    this.redComponent = 150;
    this.greenComponent = 175;
    this.blueComponent = 200;
    this.canvasBgColor = "#ddd";
  
    this.#addEventListeners();
  }

  get waveComponentColors(){
    const color = this.waveColorElement.value;
    const red = parseInt(color.substr(1,2), 16)
    const green = parseInt(color.substr(3,2), 16)
    const blue = parseInt(color.substr(5,2), 16)

    return {
      red, green, blue
    }
  }

  applyFilter() {
    if(!this.audioContext)  this.audioContext = new AudioContext();
    if(!this.audioSource)   this.audioSource = this.audioContext.createMediaElementSource(this.audioElement);
    if(!this.audioAnalyser) this.audioAnalyser = this.audioContext.createAnalyser();
    if(!this.filter)         this.filter = this.audioContext.createBiquadFilter();

    const hasChanged = this.filter.type !== this.filterTypeSelect.value ||
    this.filter.frequency.value !== parseFloat(this.filterFrequencyInput.value) ||
    this.filter.Q.value !== parseFloat(this.filterQInput.value);

    if(!hasChanged) return;
    
    this.audioAnalyser.fftSize = this.fftSize;

    this.filter.type = this.filterTypeSelect.value;
    this.filter.frequency.value = parseFloat(this.filterFrequencyInput.value);
    this.filter.Q.value = parseFloat(this.filterQInput.value);

    this.audioSource.connect(this.filter);
    this.audioSource.connect(this.audioAnalyser);
    this.filter.connect(this.audioAnalyser);
    this.audioAnalyser.connect(this.audioContext.destination);

    const bufferLength = this.audioAnalyser.frequencyBinCount;
    this.audioData = new Uint8Array(bufferLength);
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

  #getCanvasInfo(){
    [this.width, this.height] = this.#getCanvasSize();

    this.canvasElement.width = this.width;
    this.canvasElement.height = this.height;
    this.canvasContext = this.canvasElement.getContext('2d');
  }

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
    this.waveColorElement = document.getElementById('waveColor');
    this.bgColorElement = document.getElementById('bgColor');

    this.filterTypeSelect = document.getElementById('filterType');
    this.filterFrequencyInput = document.getElementById('filterFrequency');
    this.filterQInput = document.getElementById('filterQ');
  }

  #addEventListeners() {
    this.fftSizeElement.addEventListener('change', (event) => {
      this.fftSize = parseInt(event.target.value);
      this.#captureAudioData();
    });

    this.bgColorElement.value = `rgb(${this.redComponent}, ${this.greenComponent}, ${this.blueComponent})`;
    this.waveColorElement.addEventListener('input', (event) => {
      const { red, green, blue } = this.waveComponentColors;

      this.redComponent = red;
      this.greenComponent = green;
      this.blueComponent = blue;
    });

    this.bgColorElement.addEventListener('input', (event) => { this.canvasBgColor = event.target.value; });

    this.fileElement.addEventListener('change', this.onFileChange.bind(this));
    this.audioElement.addEventListener('timeupdate', this.#updateAudioInfo.bind(this));
    this.audioElement.addEventListener('play', () => { this.statusElement.textContent = 'Status: Playing'; });
    this.audioElement.addEventListener('pause', () => { this.statusElement.textContent = 'Status: Paused'; });
    this.audioElement.addEventListener('ended', () => { this.statusElement.textContent = 'Status: Ended'; });

    this.filterTypeSelect.addEventListener('change', this.applyFilter.bind(this));
    this.filterFrequencyInput.addEventListener('change', this.applyFilter.bind(this));
    this.filterQInput.addEventListener('change', this.applyFilter.bind(this));
  }

  #updateAudioInfo() {
    this.currentTimeElement.textContent = `Current Time: ${Math.floor(this.audioElement.currentTime / 60)}:${Math.floor(this.audioElement.currentTime % 60)}`;
    this.durationElement.textContent = `Duration: ${Math.floor(this.audioElement.duration / 60)}:${Math.floor(this.audioElement.duration % 60)}`;
    this.volumeElement.textContent = `Volume: ${(this.audioElement.volume * 100).toFixed(2)}%`;
    this.fileNameElement.textContent = `File Name: ${this.file.name}`;
    this.sampleRateElement.textContent = `Sample Rate: ${this.audioContext.sampleRate} Hz`;
    this.averageFrequencyElement.textContent = `Average Frequency: ${(this.audioData.reduce((acc, val) => acc + val, 0) / this.audioData.length).toFixed(2)} Hz`;
    this.maxFrequencyElement.textContent = `Max Frequency: ${Math.max(...this.audioData)} Hz`;
    
    this.applyFilter();
  }

  #captureAudioData() {
    this.applyFilter();

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

    this.canvasContext.fillStyle = this.canvasBgColor;
    this.canvasContext.fillRect(0, 0, this.width, this.height);

    const min = Math.min(...this.audioData);
    const max = Math.max(...this.audioData);
    const normalize = (value) => (value - min) / (max - min) * 130;

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