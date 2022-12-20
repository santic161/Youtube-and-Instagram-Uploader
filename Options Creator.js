const fs = require('fs');
let options = {};

const makeOptions = async (originVideoName, originAudioName) => {
    let promise = new Promise((resolve, reject) => {
        // console.log(originVideoName)
    let res = fs.readFileSync("./Future videos/Links.txt").toString().split("\n")
    let selectedVideo = ""
    let is4K = false
    res.forEach(Video => {

        const Url = Video.split(" ")[0]
        let videoName = ""

        if(Url.includes("https://livewallpapers4free.com")){
            videoName = Url.split("/")[3]
        } else {
            videoName = Url.split("/")[4]
        }
        
        if(videoName + ".mp4" == originVideoName){
            is4K = (Video.split(" ")[1] == "[3840")?true:false
            selectedVideo = Url
        }
    })

    fs.readdirSync('./Future Music').forEach(file => {
        if(file == "Options.json" || file == "TrackList.txt") return
        if(originAudioName != file) return
        const fileName = file.split(".")[0]
        const domainUrl = selectedVideo.split("/")[2]
        const urlWithoutHttps = selectedVideo.split("https://")[1]
        // const isMix = fileName.includes("Mix")
        const isMix = true //All videos will be mix

        const TrackListFile = fs.readFileSync("./Future Music/TrackList.txt").toString().split('\r\n' + '\r\n')
        let TrackIndex = 0;
        TrackListFile.forEach((track, index) => {
            if(track.split("\n")[1].includes(fileName)) {
                TrackIndex = index
            }
        })

        let Track = TrackListFile[TrackIndex]
        let TrackList = Track.split("\n").slice(1).join("\r\n")
        options = {
            Title: fileName,
            Title4K: fileName + " 「4K UHD」",
            is4K,
            Description: 
`ღ Thank you for watching my video ღ 
❖ Subscribe and turn on the bell for more ❖

${isMix && `
▶️ Mix Information
Best Nightcore Gaming Mix 2022

♫ Tracklist:`}
${TrackList}

-----------------------------------

Animated Wallpapers: ${domainUrl}
Background Video: ${urlWithoutHttps}

Author: Unknown

-----------------------------------
© Important:
• Note: Be aware all music and pictures belongs to the original artists.
✖ I am in no position to give anyone permission to use this
✓ All songs in this video have been licensed for the right of use

• Copyright/Claims/Issues: santi.c161005@gmail.com`}
        resolve(options)
    })
})
return promise
}

module.exports = {makeOptions}