# RNNoise Demo - AI-Powered Noise Cancellation

A Next.js demo application showcasing real-time noise cancellation using the RNNoise neural network via WebAssembly.

## Features

- 🎤 **Real-time Audio Recording** with microphone access
- 🎵 **Live Audio Visualization** for both original and processed audio
- 🤖 **AI-Powered Noise Cancellation** using RNNoise neural network
- 🔊 **Side-by-Side Audio Comparison** between original and processed audio
- 📁 **Audio Download** functionality for both versions
- 📱 **Responsive Design** that works on desktop and mobile

## Technology Stack

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **@timephy/rnnoise-wasm** for noise cancellation
- **Web Audio API** for real-time audio processing
- **WebAssembly** for high-performance audio processing

## Getting Started

### Prerequisites

- Node.js 18+ 
- A modern web browser with microphone support
- HTTPS connection (required for microphone access)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Usage

1. **Record Audio**: Click "Start Recording" and allow microphone access
2. **Watch Visualizations**: See real-time audio waveforms for both original and processed audio
3. **Stop Recording**: Click "Stop Recording" when finished
4. **Compare Audio**: Switch to the "Compare Audio" tab to hear the difference
5. **Download**: Save both original and processed audio files

## How RNNoise Works

RNNoise is a recurrent neural network developed by Mozilla that:

- Analyzes audio in 480-sample frames (10ms at 48kHz)
- Uses machine learning to distinguish speech from noise
- Provides superior noise reduction compared to traditional methods
- Runs entirely in the browser via WebAssembly

## Demo Tips

For the best demonstration:

- Use headphones to avoid feedback
- Record in a noisy environment (fan, traffic, background chatter)
- Speak clearly during recording
- Compare the original vs processed audio carefully
- Try different types of background noise

## Technical Details

- **Sample Rate**: 48kHz
- **Frame Size**: 480 samples (10ms)
- **Processing**: Real-time with minimal latency
- **Output Format**: WAV for processed audio, WebM for original

## Browser Compatibility

- Chrome 66+
- Firefox 60+
- Safari 11.1+
- Edge 79+

Note: Requires HTTPS for microphone access in production.

## Development

The project structure:

```
src/
├── app/
│   ├── page.tsx          # Main demo page
│   ├── layout.tsx        # App layout
│   └── globals.css       # Global styles
└── components/
    ├── AudioRecorder.tsx  # Recording & processing logic
    ├── AudioPlayer.tsx    # Playback comparison
    └── AudioVisualizer.tsx # Real-time audio visualization
```

## Deployment

Build for production:

```bash
npm run build
npm start
```

The app can be deployed to any platform supporting Next.js (Vercel, Netlify, etc.).

## License

MIT License - feel free to use this project as a starting point for your own audio processing applications.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Acknowledgments

- [Mozilla RNNoise](https://github.com/mozilla/rnnoise) - The original noise suppression library
- [@timephy/rnnoise-wasm](https://github.com/timephy/rnnoise-wasm) - WebAssembly port
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
