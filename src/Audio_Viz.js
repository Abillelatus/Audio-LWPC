// @ Author: Ryan Herrin
/*
Integrated with the p5.sound lib this program displays lines that change properties 
according to the audio input. The height of the line changes with volume. The color 
of the line changes with the pitch. 
*/

let noise_line = []; // Array of line objects

// Define area to run program in
const width = 1500;
const height = 800;
var bkgrnd_color = 0;

// Set defualt line properties used for
const start_pos = width;
const vert_pos = height / 2;
const strk_wght = 1.2; //Thickness of the line
const space_between_lines = 1; //Thickness of space in between the lines

// Initial testing vars. Will be replaced later when the sound lib is added
const line_length = 10; // Default value
const line_color = 255; // Defulat value is White

// vars for mic inpit
window.AudioContext = window.AudioContext || window.webkitAudioContext;
let analyser, audioContext;
let currentNote = 0;
let currentName = "-";

// this will hold raw mic input later
let buf = new Float32Array(2048);

const noteStrings = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
];

// Creates the drawing area
function setup() {
    createCanvas(width, height);
}

// What displays the lines
function draw() {
    background(bkgrnd_color);

    button = createButton("start recording");
    button.position(10, 20);
    button.mousePressed(startRecording);

    textSize(32);
    fill(line_color);
    text(currentNote, 10, 60);
    text(currentName, 10, 100);

    // Create new line to add to the array
    noise_line.push(new AudioLine());

    for (let lyne = 0; lyne < noise_line.length; lyne++) {
        noise_line[lyne].move();
        noise_line[lyne].display();
    }

    // Remove lines if the are outside of the canvas x-axis so we don't use processing power
    // for lines that we can't see
    if (noise_line[0].x_pos < 0) {
        noise_line.shift();
    }

    // if we started recording already update pitch every frame
    if (analyser) {
        updatePitch();
    }
}

// Class to create audio line object
class AudioLine {
    constructor() {
        this.x_pos = start_pos;
        this.y_pos = height - (Math.round(currentNote) / 10) * 7; // Will be dtermined by audio input
        this.lngth = line_length;
        this.thickness = strk_wght;
        this.color = line_color; // Will be dtermined by audio input
    }

    move() {
        /* Used to create the scrolling from right to left */
        this.x_pos = this.x_pos - this.thickness * 2;
    }

    display() {
        line(
            this.x_pos,
            this.y_pos - this.lngth / 2,
            this.x_pos,
            this.y_pos + this.lngth / 2
        );
        strokeWeight(this.thickness);
        stroke(this.color);
    }
} //END AudioLine CLASS

/**
 * Chrome requires user input to start recording so this is
 * where i put it
 */
function startRecording() {
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    navigator.mediaDevices
        .getUserMedia({
            audio: {
                mandatory: {
                    googEchoCancellation: "false",
                    googAutoGainControl: "false",
                    googNoiseSuppression: "false",
                    googHighpassFilter: "false",
                },
                optional: [],
            },
        })
        .then(function (stream) {
            // connect analyser to mic input
            let mediaStreamSource =
                audioContext.createMediaStreamSource(stream);
            mediaStreamSource.connect(analyser);

            // get current pitch once upon init
            updatePitch();
        })
        .catch(function (err) {
            console.log(err);
        });
}

/**
 * Every time this is called, grab a little sample of mic
 * input and calculate the current pitch
 */
function updatePitch() {
    analyser.getFloatTimeDomainData(buf);

    // raw freq of current input
    let pitch = autoCorrelate(buf, audioContext.sampleRate);
    currentNote = pitch;

    if (pitch != -1) {
        // note name of closest official note
        let name = noteStrings[noteFromPitch(pitch) % 12];
        currentName = name;
    } else {
        currentName = "-";
    }
}

/**
 * I'm pretty sure this translates a frequency into the
 * closest official note frequency?? but honestly i have no idea
 */
function noteFromPitch(frequency) {
    var noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    return Math.round(noteNum) + 69;
}

/**
 * Checks for volume of input, and if loud enough
 * returns the frequency of current mic input in Hz
 */
function autoCorrelate(buf, sampleRate) {
    var SIZE = buf.length;
    var MAX_SAMPLES = Math.floor(SIZE / 2);
    var best_offset = -1;
    var best_correlation = 0;
    var rms = 0;
    var foundGoodCorrelation = false;
    var correlations = new Array(MAX_SAMPLES);

    for (var i = 0; i < SIZE; i++) {
        var val = buf[i];
        rms += val * val;
    }

    // short circuit if not loud enough to bother
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.05) return -1;

    var lastCorrelation = 1;
    for (var offset = 0; offset < MAX_SAMPLES; offset++) {
        var correlation = 0;

        for (var i = 0; i < MAX_SAMPLES; i++) {
            correlation += Math.abs(buf[i] - buf[i + offset]);
        }

        correlation = 1 - correlation / MAX_SAMPLES;
        correlations[offset] = correlation;

        if (correlation > 0.9 && correlation > lastCorrelation) {
            foundGoodCorrelation = true;
            if (correlation > best_correlation) {
                best_correlation = correlation;
                best_offset = offset;
            }
        } else if (foundGoodCorrelation) {
            var shift =
                (correlations[best_offset + 1] -
                    correlations[best_offset - 1]) /
                correlations[best_offset];
            return sampleRate / (best_offset + 8 * shift);
        }
        lastCorrelation = correlation;
    }

    if (best_correlation > 0.01) {
        return sampleRate / best_offset;
    }

    return -1;
}
