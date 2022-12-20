// Import dependencies
require("dotenv").config();
const Jimp = require("jimp");
const fs = require("fs-extra");
const util = require("util");
const readline = require("readline");
const path = require("path");
const { google } = require("googleapis");
const { authenticate } = require("@google-cloud/local-auth");
const {makeOptions} = require("./Options Creator.js")
const { IgApiClient } = require('instagram-private-api');
const readFileAsync = util.promisify(fs.readFile);

const exec = util.promisify(require("child_process").exec);

const debug = false;
const output = "output.mp4";
const preview = "preview.mp4";
const timePreview = "60"; //In seconds

(async () => {
  //   const auth = await authenticate({
  //   keyfilePath: path.join(__dirname, "./oauth2.keys.json"),
  //   scopes: [
  //     "https://www.googleapis.com/auth/youtube.upload",
  //     "https://www.googleapis.com/auth/youtube",
  //   ],
  // });

  // google.options({ auth });
})()




const generateVideo = async (randomAudio, randomVideo) => {
  const promise = new Promise(async (resolve, rejects) => {

    console.log("Decoding");
    console.log(
      `Video seleccionado: ${randomVideo}  || Audio seleccionado: ${randomAudio}`
    );
    await exec(
      `ffmpeg -i "./Future videos/${randomVideo}" temp/raw-frames/%d.jpeg`
    );
    console.log("Rendering");
    // const frames = fs.readdirSync("temp/raw-frames");
  
    // for (let count = 1; count <= frames.length; count++) {
    //   // Read the frame
    //   let frame = await Jimp.read(`temp/raw-frames/${count}.png`);
  
    //   // Modified the frame
    //   frame = await onFrame(frame, count);
  
    //   // Save the frame
    //   await frame.writeAsync(`temp/edited-frames/${count}.png`);
    // }
  
    console.log("Encoding");
  
    //Modify raw-frames to edited-frames to see the changes
  
    await exec(
      `ffmpeg -framerate 60 -i temp/raw-frames/%d.jpeg -c:a copy -shortest -c:v libx264 -pix_fmt yuv420p temp/no-audio.mp4`
    );
  
    console.log("Adding audio and exporting Output");
    await exec(
      `ffmpeg -stream_loop -1 -i temp/no-audio.mp4 -i "./Future Music/${randomAudio}" -shortest -c copy -map 0:v:0 -map 1:a:0 ${output}`
    );
    
    console.log("Adding audio and exporting Preview for Instagram");
    await exec(
      `ffmpeg -stream_loop -1 -i temp/no-audio.mp4 -i "./Future Music/${randomAudio}" -b:a 65K -b:v 600K  -vf scale=-1:720 -r 30 -shortest -map 0:v:0 -map 1:a:0 -t ${timePreview} ${preview}`
    );
    
  
    resolve();
    })
    return promise;
};

const uploadToYoutube = async (audio, video) => {
  const youtube = google.youtube("v3");

  const fileSize = fs.statSync(output).size;

  const optionsData = await makeOptions(video, audio)
  // console.log(optionsData)

  let options = {
    part: 'id,snippet,status',
    notifySubscribers: !debug,
    requestBody: {
      snippet: {
        title: optionsData.is4K?optionsData.Title4K:optionsData.Title,
        description: optionsData.Description,
      },
      status: {
        privacyStatus: debug == true? "private" : "public",
      },
    },
    media: {
      body: fs.createReadStream(output),
    },
  };

  const res = await youtube.videos.insert(options, {
    onUploadProgress: evt => {
      const progress = (evt.bytesRead / fileSize) * 100;
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0, null);
      process.stdout.write(`${Math.round(progress)}% complete`);
    }
  })

  let now = new Date()
  
  console.log(`Video uploaded: https://youtu.be/${res.data.id}  | ${now.toLocaleTimeString("en-US")}`)
  await fs.unlink("output.mp4");

  uploadToInstagram();
};

const uploadToInstagram = async () => {
  const ig = new IgApiClient();
  ig.state.generateDevice(process.env.IG_USERNAME);
  await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);

  await ig.publish.video({
    video: await readFileAsync("./320514416_965686941503525_5634250318811604712_n.mp4"),
    coverImage: fs.readFileSync("./temp/raw-frames/1.jpeg"),
    caption: "New nightcore mix video on my channel 🎧\n\nLink to the video in my bio"
  });
  console.log("Video uploaded to Instagram  ||  " + new Date.now().toLocaleTimeString("en-US"))

  console.log("Cleaning up");
  await fs.remove("temp");
  await fs.unlink("preview.mp4");

}

async function createVideo() {
  try {
    console.log("Initializing temporary files");
    await fs.mkdir("temp");
    await fs.mkdir("temp/raw-frames");
    await fs.mkdir("temp/edited-frames");
    const AudioName = fs.readdirSync("./Future Music/");
    const VideoName = fs.readdirSync("./Future videos/");
    let randomVideo = VideoName[Math.floor(Math.random() * VideoName.length)];
    let randomAudio = AudioName[Math.floor(Math.random() * AudioName.length)];
    let verified = false;
    const verifyRandom = () => {
      if(randomVideo == "Links.txt") randomVideo = VideoName[Math.floor(Math.random() * VideoName.length)];
      if(randomAudio == "TrackList.txt") randomAudio = AudioName[Math.floor(Math.random() * AudioName.length)];
      else {
        verified = true;
      }
    }
    while(!verified) {
      verifyRandom();
    }

    await generateVideo(randomAudio, randomVideo)

    uploadToYoutube(randomAudio, randomVideo);
    // uploadToInstagram()
  } catch (error) {
    console.log("An error occurred:", error);

    if (debug === false) {
      await fs.remove("temp");
    }
  }
};
createVideo()
setInterval(() => createVideo(), 1000*60*60*2)

async function onFrame(frame, frameCount) {
  if (frameCount < 5) {
    frame = new Jimp(
      frame.bitmap.width,
      frame.bitmap.height,
      0xff0000ff,
      (err, image) => {}
    );
  } else {
    // Add text
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
    frame.print(font, 0, 0, `Frame Count: ${frameCount}`);

    // Manual manipulation
    frame.scan(
      0,
      0,
      frame.bitmap.width,
      frame.bitmap.height,
      function (x, y, idx) {
        // Get the colors
        const red = this.bitmap.data[idx + 0];
        const green = this.bitmap.data[idx + 1];
        const blue = this.bitmap.data[idx + 2];
        const alpha = this.bitmap.data[idx + 3];

        // If x is less than y
        if (x < y) {
          // Set the blue channel to 255
          this.bitmap.data[idx + 2] = 255;
        }
      }
    );
  }

  return frame;
}
