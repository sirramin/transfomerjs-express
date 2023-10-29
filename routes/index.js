// import { pipeline } from '@xenova/transformers';
// import wavefile from 'wavefile';
// import fs from 'fs';

var express = require('express');
// var { pipeline } = require('@xenova/transformers');
var wavefile = require('wavefile');
var fs = require('fs');
var { join } = require('path');
const multer = require('multer');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})

const upload = multer({ storage: storage })
var router = express.Router();

/* GET home page. */
router.get('/', async function (req, res, next) {
  res.render('index', { title: 'Express' });

});

router.post('/transcribe', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'Invalid file type.' });
    return;
  }

  // Save the uploaded file to the server.
  // await file.mv('./uploads/' + file.name);


  const TransformersApi = Function('return import("@xenova/transformers")')();
  const { pipeline } = await TransformersApi;
  // Load model
  let transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');

  // Load audio data
  // let url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav';
  // let buffer = Buffer.from(await fetch(url).then(x => x.arrayBuffer()))

  // let url = './Recording(9).wav'
  const filePath = join(process.cwd(), './uploads/' + file.filename);
  console.log('filePath', filePath);
  const buffer = Buffer.from(fs.readFileSync(filePath));

  // Read .wav file and convert it to required format
  let wav = new wavefile.WaveFile(buffer);
  wav.toBitDepth('32f'); // Pipeline expects input as a Float32Array
  wav.toSampleRate(16000); // Whisper expects audio with a sampling rate of 16000
  let audioData = wav.getSamples();
  if (Array.isArray(audioData)) {
    if (audioData.length > 1) {
      const SCALING_FACTOR = Math.sqrt(2);

      // Merge channels (into first channel to save memory)
      for (let i = 0; i < audioData[0].length; ++i) {
        audioData[0][i] = SCALING_FACTOR * (audioData[0][i] + audioData[1][i]) / 2;
      }
    }

    // Select first channel
    audioData = audioData[0];
  }

  // Run model
  let start = performance.now();
  let output = await transcriber(audioData);
  let end = performance.now();
  console.log(`Execution duration: ${(end - start) / 1000} seconds`);
  console.log(output);
  res.status(200).json({
    message: output
  });

});


module.exports = router;
