const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const app = express();

// Enable CORS for your frontend origin
app.use(cors({
  origin: 'https://assemblepoint.onrender.com',
  methods: ['POST'],
  allowedHeaders: ['Content-Type']
}));

// Configure multer to handle multipart/form-data
const upload = multer({
  storage: multer.memoryStorage(), // Store file in memory as a Buffer
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

app.post('/process', upload.single('video'), (req, res) => {
  console.log('Request body type:', typeof req.body); // Debug: Check type of req.body
  console.log('Request file:', req.file); // Debug: Check if multer parsed the file

  // Check if multer successfully parsed the file
  if (!req.file) {
    console.error('No video file uploaded, req.file is undefined');
    return res.status(400).send('No video file uploaded');
  }

  const inputBuffer = req.file.buffer; // Should be a Buffer
  const inputFile = `temp_${Date.now()}.webm`;
  const outputFile = `output_${Date.now()}.webm`;

  console.log('Received video, size:', inputBuffer.length, 'bytes, type:', typeof inputBuffer);

  try {
    fs.writeFileSync(inputFile, inputBuffer);
    console.log('Input file saved:', inputFile);
  } catch (err) {
    console.error('Failed to write input file:', err);
    return res.status(500).send('Failed to save input file');
  }

  const ffmpeg = spawn('ffmpeg', [
    '-i', inputFile,
    '-vf', 'minterpolate=fps=30:mi_mode=mci',
    '-c:v', 'libvpx',
    '-b:v', '1M',
    '-c:a', 'copy',
    outputFile
  ]);

  let ffmpegOutput = '';
  ffmpeg.stderr.on('data', (data) => {
    ffmpegOutput += data.toString();
  });

  ffmpeg.on('error', (err) => {
    console.error('FFmpeg error:', err);
    console.error('FFmpeg output:', ffmpegOutput);
    if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
    res.status(500).send('Processing failed');
  });

  ffmpeg.on('close', (code) => {
    console.log('FFmpeg exited with code:', code);
    if (code === 0) {
      try {
        const outputBuffer = fs.readFileSync(outputFile);
        console.log('Output file size:', outputBuffer.length, 'bytes');
        res.set('Content-Type', 'video/webm');
        res.send(outputBuffer);

        // Clean up
        if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
      } catch (err) {
        console.error('Failed to read output file:', err);
        if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
        res.status(500).send('Failed to read output file');
      }
    } else {
      console.error('FFmpeg output:', ffmpegOutput);
      if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
      res.status(500).send('Processing failed');
    }
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
