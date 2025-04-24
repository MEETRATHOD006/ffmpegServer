const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const app = express();

// Middleware to handle raw video data
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

app.post('/process', (req, res) => {
  const inputBuffer = req.body;
  const inputFile = `temp_${Date.now()}.webm`;
  const outputFile = `output_${Date.now()}.webm`;

  // Save the raw video temporarily
  fs.writeFileSync(inputFile, inputBuffer);

  // Run FFmpeg to upscale FPS to 30 (adjust as needed)
  const ffmpeg = spawn('ffmpeg', [
    '-i', inputFile,
    '-vf', 'minterpolate=fps=30:mi_mode=mci', // Interpolates to 30 FPS with motion compensation
    '-c:v', 'libvpx',
    '-b:v', '1M', // Bitrate, adjust for quality
    '-c:a', 'copy', // Copy audio without re-encoding
    outputFile
  ]);

  ffmpeg.on('error', (err) => {
    console.error('FFmpeg error:', err);
    fs.unlinkSync(inputFile);
    res.status(500).send('Processing failed');
  });

  ffmpeg.on('close', (code) => {
    if (code === 0) {
      // Read the processed file
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