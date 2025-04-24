const express = require('express');
const cors = require('cors'); // Add CORS package
const { spawn } = require('child_process');
const fs = require('fs');
const app = express();

// Enable CORS for your frontend origin
app.use(cors({
  origin: 'https://assemblepoint.onrender.com', // Allow only your frontend domain
  methods: ['POST'], // Allow only POST requests
  allowedHeaders: ['Content-Type'] // Allow Content-Type header for FormData
}));

// Middleware to handle raw video data
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

app.post('/process', (req, res) => {
  const inputBuffer = req.body;
  const inputFile = `temp_${Date.now()}.webm`;
  const outputFile = `output_${Date.now()}.webm`;

  // Save the raw video temporarily
  fs.writeFileSync(inputFile, inputBuffer);

  // Run FFmpeg to upscale FPS to 30
  const ffmpeg = spawn('ffmpeg', [
    '-i', inputFile,
    '-vf', 'minterpolate=fps=30:mi_mode=mci',
    '-c:v', 'libvpx',
    '-b:v', '1M',
    '-c:a', 'copy',
    outputFile
  ]);

  ffmpeg.on('error', (err) => {
    console.error('FFmpeg error:', err);
    fs.unlinkSync(inputFile);
    res.status(500).send('Processing failed');
  });

  ffmpeg.on('close', (code) => {
    if (code === 0) {
      const outputBuffer = fs.readFileSync(outputFile);
      res.set('Content-Type', 'video/webm');
      res.send(outputBuffer);

      // Clean up temporary files
      fs.unlinkSync(inputFile);
      fs.unlinkSync(outputFile);
    } else {
      console.error('FFmpeg exited with code:', code);
      fs.unlinkSync(inputFile);
      res.status(500).send('Processing failed');
    }
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
