// Import dependencies
require("dotenv").config();
const Jimp = require("jimp");
const fs = require("fs-extra");
const util = require("util");
const readline = require("readline");
const path = require("path");
const { google } = require("googleapis");
const { authenticate } = require("@google-cloud/local-auth");
const { makeOptions } = require("./Options Creator.js");
const { IgApiClient } = require("instagram-private-api");
const readFileAsync = util.promisify(fs.readFile);

const exec = util.promisify(require("child_process").exec);

const debug = false;
const output = "output.mp4";
const preview = "preview.mp4";
const timePreview = "60"; //In seconds
const timePreviewShort = "30"; //In seconds

(async () => {
    const auth = await authenticate({
        keyfilePath: path.join(__dirname, "./oauth2.keys.json"),
        scopes: [
            "https://www.googleapis.com/auth/youtube.upload",
            "https://www.googleapis.com/auth/youtube",
            "https://www.googleapis.com/auth/youtube.force-ssl",
        ],
    });

    google.options({ auth });
})();

const generateVideo = async (randomAudio, randomVideo, isMix, is4K) => {
    const promise = new Promise(async (resolve, rejects) => {
        console.log("Decoding");
        console.log(
            `Video seleccionado: ${randomVideo}  || Audio seleccionado: ${randomAudio}`
        );
        await exec(
            `ffmpeg -i "./Future Videos/${randomVideo}" temp/raw-frames/%d.jpeg`
        );
        // console.log("Rendering");
        const frames = fs.readdirSync("temp/raw-frames");
        let backgroundColor = "";
        
        for (let count = 1; count <= frames.length; count++) {
            // Read the frame
            let frame = await Jimp.read(`temp/raw-frames/${count}.jpeg`);
            // Modified the frame
            ({ frame, backgroundColor } = await onFrame(
                frame,
                backgroundColor,
                is4K
            ));

            const progress = count * 100 / frames.length;
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0, null);
            process.stdout.write(`${Math.round(progress)}% complete`);

            // Save the frame
            await frame.writeAsync(`temp/edited-frames/${count}.jpeg`);
        }

        console.log("Encoding");

        //Modify raw-frames to edited-frames to see the changes
        await exec(
            `ffmpeg -start_number 1 -i temp/edited-frames/%d.jpeg -vcodec libx264 -filter:v "setpts=0.5*PTS" temp/no-audio.mp4`
        );
        // await exec(
        //     `ffmpeg -framerate 60 -i temp/edited-frames/%d.jpeg -c:a copy -shortest -c:v libx264 -pix_fmt yuv420p temp/no-audio.mp4`
        // );

        console.log("Adding suscribe button");
        if (!is4K) {
            await exec(
                `ffmpeg -i "./Future Videos/${randomVideo}" -i "./Subscribe Button.mp4" -filter_complex "[1:v]colorkey=0x10FF0B:0.3:0.2[ckout];[0:v][ckout]overlay[out]"  -map "[out]" "./temp/unified.mp4"`
            );
        } else {
            //Convert video to 4k resolution
            //ffmpeg -i in.mp4 -clsvf scale=-1:2160:flags=lanczos -c:v libx264 -crf 21 out.mp4
            await exec(
                `ffmpeg -i "./Future Videos/${randomVideo}" -i "./Subscribe Button 4K.mp4" -filter_complex "[1:v]colorkey=0x10FF0B:0.3:0.2[ckout];[0:v][ckout]overlay[out]"  -map "[out]" "./temp/unified.mp4"`
            );
        }

        console.log("Adding audio and exporting Output");
        await exec(
            `ffmpeg -stream_loop -1 -i temp/unified.mp4 -i "${
                isMix
                    ? `./Future Music/${randomAudio}`
                    : `./Future Solo Music/${randomAudio}`
            }" -shortest -c copy -map 0:v:0 -map 1:a:0 ${output}`
        );

        console.log("Adding audio and exporting Preview for Instagram");
        await exec(
            `ffmpeg -stream_loop -1 -i temp/no-audio.mp4 -i "${
                isMix
                    ? `./Future Music/${randomAudio}`
                    : `./Future Solo Music/${randomAudio}`
            }" -b:a 65K -b:v 600K  -vf scale=-1:720 -r 30 -shortest -map 0:v:0 -map 1:a:0 -t ${timePreview} ${preview}`
        );

        console.log("Creating Short Video...");
        await exec(
            `ffmpeg -i "${output}" -vf "split [original][copy]; [copy] crop=ih*9/16:ih:iw/2-ow/2:0, scale=1280:2282, gblur=sigma=20[blurred]; [blurred][original]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2" -t ${timePreviewShort} short.mp4`
        );

        console.log("Done");

        resolve();
    });
    return promise;
};

const uploadToYoutube = async (optionsData, TrackList) => {
    const youtube = google.youtube("v3");

    const fileSize = fs.statSync(output).size;

    // console.log(optionsData)
    let tags = [
        "Nightcore",
        "Nightcore mix",
        "Nightcore 2023",
        "Happy hardcore",
        "Happy Hardcore mix",
        "Happy Hardcore Nightcore",
        "nightcore mix",
        "Nightcore S3RL",
        "s3rl mix",
        "nightcore s3rl mix",
        "nightcore 3h mix",
        "nightcore mix 2023",
        "japanese relaxing song",
        "Best Acoustic Japanese Song",
        "acoustic japanese songs",
        "japanese acoustic songs",
        "japanese acoustic female",
        "relaxing japanese song",
    ];

    let options = {
        part: "id,snippet,status",
        notifySubscribers: !debug,
        requestBody: {
            snippet: {
                title: optionsData.is4K
                    ? optionsData.Title4K
                    : optionsData.Title,
                description: optionsData.Description,
                tags: tags,
            },
            status: {
                privacyStatus: debug == true ? "private" : "public",
            },
        },
        media: {
            body: fs.createReadStream(output),
        },
    };
    let optionsShort = {
        part: "id,snippet,status",
        notifySubscribers: !debug,
        requestBody: {
            snippet: {
                title:
                    (optionsData.is4K
                        ? optionsData.Title4K
                        : optionsData.Title) + " #short",
                description: optionsData.Description,
                tags: tags,
            },
            status: {
                privacyStatus: debug == true ? "private" : "public",
            },
        },
        media: {
            body: fs.createReadStream("short.mp4"),
        },
    };

    // const Miniaturas = fs.readdirSync("./Miniaturas/");
    // const randomThumbnail = Math.floor(Math.random() * Miniaturas.length);
    // let thumbnails = Miniaturas[randomThumbnail]

    // console.log("Miniatura: " + thumbnails)

    const res = await youtube.videos.insert(options, {
        onUploadProgress: (evt) => {
            const progress = (evt.bytesRead / fileSize) * 100;
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0, null);
            process.stdout.write(`${Math.round(progress)}% complete`);
        },
    });

    console.log("\n");

    console.log("Uploading Short...");

    youtube.videos.insert(optionsShort, {
        onUploadProgress: (evt) => {
            const progress = (evt.bytesRead / fileSize) * 100;
            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0, null);
            process.stdout.write(`${Math.round(progress)}% complete`);
        },
    });

    console.log("\n");

    youtube.thumbnails.set({
        videoId: res.data.id,
        media: {
            body: fs.readFileSync(`./temp/raw-frames/1.jpeg`),
        },
    });

    let now = new Date();

    let optionsComment = {
        part: "snippet",
        resource: {
            snippet: {
                channelId: "UCxTpVPqP32mgnYR2pihvuqg",
                videoId: res.data.id,
                topLevelComment: {
                    snippet: {
                        textOriginal: `TrackList:
${TrackList}`,
                        textDisplay: `TrackList:
${TrackList}`,
                    },
                },
            },
        },
    };
    try {
        if (TrackList) {
            youtube.commentThreads.insert(optionsComment);
        }
    } catch {
        console.log(
            "Error posting comment - Check if the comment was Uploaded"
        );
    } finally {
        console.log(
            `\nVideo uploaded: https://youtu.be/${
                res.data.id
            }  ||  ${now.toLocaleTimeString("en-US")}\n\n`
        );
        await fs.unlink("output.mp4");
        await fs.unlink("short.mp4");

        uploadToInstagram();
    }
};

const uploadToInstagram = async () => {
    const ig = new IgApiClient();
    ig.state.generateDevice(process.env.IG_USERNAME);
    await ig.simulate.preLoginFlow();
    await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);

    await ig.publish.video({
        video: await readFileAsync(preview),
        coverImage: await readFileAsync("./temp/raw-frames/1.jpeg"),
        usertags: {
            in: [
                {
                    user_id: process.env.nightcoremusic2ndID,
                    position: [0.5, 0.5],
                },
            ],
        },
        caption:
            "New nightcore mix video on my channel 🎧\n\nLink to the video in my bio",
    });

    let now = new Date();

    console.log(
        "Video uploaded to Instagram  ||  " + now.toLocaleTimeString("en-US")
    );

    console.log("Cleaning up");
    await fs.remove("temp");
    await fs.unlink("preview.mp4");
};

async function createVideo() {
    try {
        console.log("Initializing temporary files");
        await fs.mkdir("temp");
        await fs.mkdir("temp/raw-frames");
        await fs.mkdir("temp/edited-frames");
        let probability = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1];
        const isMix =
            probability[Math.floor(Math.random() * probability.length)];
        const AudioName = isMix
            ? fs.readdirSync("./Future Music/")
            : fs.readdirSync("./Future Solo Music/");
        const VideoName = fs.readdirSync("./Future Videos/");
        let randomVideo =
            VideoName[Math.floor(Math.random() * VideoName.length)];
        let randomAudio =
            AudioName[Math.floor(Math.random() * AudioName.length)];
        let verified = false;

        const verifyRandom = () => {
            if (randomVideo == "Links.txt")
                randomVideo =
                    VideoName[Math.floor(Math.random() * VideoName.length)];
            if (randomAudio == "TrackList.txt")
                randomAudio =
                    AudioName[Math.floor(Math.random() * AudioName.length)];
            else {
                verified = true;
            }
        };

        while (!verified) {
            verifyRandom();
        }

        const optionsData = await makeOptions(randomVideo, randomAudio, isMix);

        await generateVideo(randomAudio, randomVideo, isMix, optionsData.is4K);

        uploadToYoutube(optionsData, optionsData.TrackList);
        // uploadToInstagram()
    } catch (error) {
        console.log("An error occurred:", error);

        if (debug === false) {
            await fs.remove("temp");
            await fs.unlink("preview.mp4");
            await fs.unlink("output.mp4");
            await fs.unlink("short.mp4");
        }
    }
}

createVideo();
setInterval(() => createVideo(), 1000 * 60 * 60 * 4);

async function onFrame(frame, backgroundColor, is4K) {
    // Add text
    //White Background => Black Text
    if (backgroundColor == "") {
        let color = Jimp.intToRGBA(frame.getPixelColor(0, 0));
        let avg = (color.r + color.g + color.b) / 3;
        if (avg >= 150) backgroundColor = "White";
        else backgroundColor = "Black";
    }
    if (backgroundColor == "White") {
        let font;
        is4K
            ? (font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK))
            : (font = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK));
        frame.print(font, 50, 50, `@NightcoreMusic64`);
    } else if (backgroundColor == "Black") {
        let font;
        is4K
            ? (font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE))
            : (font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE));
        frame.print(font, 50, 50, `@NightcoreMusic64`);
    }

    return { frame, backgroundColor };
}

process.on("exit", async () => {
    await fs.remove("temp");
    await fs.unlink("preview.mp4");
    await fs.unlink("output.mp4");
    await fs.unlink("short.mp4");
});
