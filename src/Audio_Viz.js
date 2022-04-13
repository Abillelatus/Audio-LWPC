// @ Author: Ryan Herrin
/*
Integrated with the p5.sound lib this program displays lines that change properties 
according to the audio input. The height of the line changes with volume. The color 
of the line changes with the pitch. 
*/

let noise_line = []; // Array of line objects
let spkr_img;

// Define area to run program in
const width = 1500;
const height = 800;
var bkgrnd_color = 0;

// Set defualt line properties used for
const start_pos = width - 110;
const vert_pos = height / 2;
const strk_wght = 1.2; //Thickness of the line
const space_between_lines = 1; //Thickness of space in between the lines

// Initial testing vars. Will be replaced later when the sound lib is added
const line_length = 10; // Default value
var mic_multiplier;
const input_amp = 2; // Amplifies the signal of mic_multiplier

// Alternate mic input for pitch analysis
window.AudioContext = window.AudioContext || window.webkitAudioContext;
let analyser, audioContext;
var curr_pitch; // Determines the color

//var line_color = frequency_to_rgb(curr_pitch);
var line_color = 255;

// this will hold raw mic input later
let buf = new Float32Array(2048);

// Preload function to load images
function preload() {
    spkr_img = loadImage("img/speaker.png");
}

// Creates the drawing area
function setup() {
    let cnv = createCanvas(width, height);

    // Mic Setup
    cnv.mousePressed();
    textAlign(CENTER); // Press to start
    mic_in = new p5.AudioIn();
    mic_in.start();
}

function mousePressed() {
    userStartAudio();
    startRecording();
}

// What displays the lines
function draw() {
    background(bkgrnd_color);

    // Mic interaction
    text("tap to start", width / 2, 20);
    mic_multiplier = mic_in.getLevel();

    // for pitch analysis
    if (analyser) {
        updatePitch();
    }

    // Update color of the line
    //frequency_to_rgb(curr_pitch);

    // Add image of speaker
    image(spkr_img, width - 110, height / 2 - 65), 20, 20;

    // Create new line to add to the array
    noise_line.push(new AudioLine());

    // Adjust x-axis of each line and re-display. This creates the motion
    for (let lyne = 0; lyne < noise_line.length; lyne++) {
        noise_line[lyne].move();
        noise_line[lyne].display();
    }

    // Remove lines if the are outside of the canvas x-axis so we don't use processing power
    // for lines that we can't see
    if (noise_line[0].x_pos < 0) {
        noise_line.shift();
    }
}

// Class to create audio line object
class AudioLine {
    constructor() {
        colorMode(HSB, 255);
        this.color = color(Math.round(curr_pitch) % 255, 255, 255);
        this.x_pos = start_pos;
        this.y_pos = vert_pos; // Will be dtermined by audio input
        this.lngth = line_length + mic_multiplier * input_amp * height;
        this.thickness = strk_wght;
        // Will be dtermined by audio input
    }

    move() {
        /* Used to create the scrolling from right to left */
        this.x_pos = this.x_pos - this.thickness * 2;
    }

    display() {
        stroke(this.color);
        strokeWeight(this.thickness);
        line(
            this.x_pos,
            this.y_pos - this.lngth / 2,
            this.x_pos,
            this.y_pos + this.lngth / 2
        );
    }
} //END AudioLine CLASS

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

    if (pitch > 1) {
        curr_pitch = pitch;
    } else {
        curr_pitch = 1;
    }
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

function frequency_to_rgb(freq_pitch) {
    // defualt color is white when no pitch is detected
    // default is red when there is a pitch detected
    if (freq_pitch < 1) {
        return 255;
    }

    const f_p = freq_pitch;

    // Create max hearing range in htz to use
    const max_htz = 10000;
    const conversion_coe = (6 * 255) / max_htz;
    var pitch_points = freq_pitch * conversion_coe;

    var r_rgb = 255; // Default to red
    var g_rgb = 0;
    var b_rgb = 0;

    var tmp_count = 0;

    var r_y_stage = true;
    var y_g_stage = false;
    var g_bb_stage = false;
    var bb_b_stage = false;
    var b_p_stage = false;
    var p_r_stage = false;

    // Get ready for a bunch of if statements
    function r_y() {
        g_rgb = g_rgb + 1;
        pitch_points = pitch_points - 1;
    }
    function y_g() {
        r_rgb = r_rgb - 1;
        pitch_points = pitch_points - 1;
    }
    function g_bb() {
        b_rgb = b_rgb + 1;
        pitch_points = pitch_points - 1;
    }
    function bb_b() {
        g_rgb = g_rgb - 1;
        pitch_points = pitch_points - 1;
    }
    function b_p() {
        r_rgb = r_rgb + 1;
        pitch_points = pitch_points - 1;
    }
    function p_r() {
        b_rgb = b_rgb - 1;
        pitch_points = pitch_points - 1;
    }

    while (pitch_points > 0) {
        if (r_y_stage == true) {
            r_y();
            if (g_rgb == 255) {
                r_y_stage = false;
                y_g_stage = true;
            }
        }
        if (y_g_stage == true) {
            y_g();
            if (r_rgb == 0) {
                y_g_stage = false;
                g_bb_stage = true;
            }
        }
        if (g_bb_stage == true) {
            g_bb();
            if (b_rgb == 255) {
                g_bb_stage = false;
                bb_b_stage = true;
            }
        }
        if (bb_b_stage == true) {
            bb_b();
            if (g_rgb == 0) {
                bb_b_stage = false;
                b_p_stage = true;
            }
        }
        if (b_p_stage == true) {
            b_p();
            if (r_rgb == 255) {
                b_p_stage = false;
                p_r_stage = true;
            }
        }
        if (p_r_stage == true) {
            p_r();
            if (b_rgb == 0) {
                p_r_stage = false;
                r_y_stage = true;
            }
        }
    }

    return r_rgb, g_rgb, b_rgb;
}
