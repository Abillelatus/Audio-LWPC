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

// Defualt line position properties 
const start_pos = width - 110; 
const vert_pos = height / 2;
const strk_wght = 1; //Thickness of the line 
const space_between_lines = 2.3; //Thickness of space in between the lines 

// Line size properties 
const line_length = 10; // Default value 
var mic_multiplier;
const input_amp = 1.5; // Amplifies the signal of mic_multiplier 

// Alternate mic input for pitch analysis 
window.AudioContext = window.AudioContext || window.webkitAudioContext;
let analyser, audioContext;
var curr_pitch; // Determines the color

//var color of the line. Will constantly be updated
var line_color = 'rgb(255, 255, 255)';

// this will hold raw mic input later
let buf = new Float32Array(2048);

// Preload function to load images
function preload() {
    spkr_img = loadImage('img/speaker.png');
}

// Creates the drawing area 
function setup () {
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

    // Add image of speaker 
    image(spkr_img, width-110, (height/2)-65), 20, 20;

    // Mic interaction
    text('tap to start', width/2, 20);
    mic_multiplier = mic_in.getLevel();
    
    // for pitch analysis
    if (analyser) {
        updatePitch();
    }

    // Update color of the line based on the pictch 
    line_color = frequency_to_rgb(curr_pitch);

    // Create new line to add to the array 
    noise_line.push(new AudioLine());
    
    // Adjust x-axis of each line and re-display. This creates the motion 
    for (let lyne = 0; lyne < noise_line.length; lyne++) {
        noise_line[lyne].move();
        noise_line[lyne].display();
    }

    // Remove lines if the are outside of the canvas x-axis so we don't use processing power
    // for lines that we can't see
    if(noise_line[0].x_pos < 0) {
        noise_line.shift();
    }

}

// Class to create audio line object 
class AudioLine {
    constructor() {
        this.color = line_color;// Will be dtermined by audio pitch
        this.x_pos = start_pos;
        this.y_pos = vert_pos; // Will be dtermined by audio amplitude
        this.lngth = line_length + ((mic_multiplier * input_amp) * height);
        this.thickness = strk_wght;
    }

    move() {
        /* Used to create the scrolling from right to left */
        this.x_pos = this.x_pos - (this.thickness * space_between_lines);
    }

    display() {
        stroke(this.color);
        strokeWeight(this.thickness);
        line(this.x_pos, this.y_pos - (this.lngth/2), this.x_pos, this.y_pos + (this.lngth/2));
    }
}//END AudioLine CLASS

function startRecording() {
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    navigator.mediaDevices
        .getUserMedia({
            audio: {
                mandatory: {
                    googEchoCancellation: "false",
                    googAutoGainControl: "true",
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
    } else {curr_pitch = 1;}

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
    if (rms < 0.02) return -1; // original was .05

    var lastCorrelation = 1;
    for (var offset = 0; offset < MAX_SAMPLES; offset++) {
        var correlation = 0;

        for (var i = 0; i < MAX_SAMPLES; i++) {
            correlation += Math.abs(buf[i] - buf[i + offset]);
        }

        correlation = 1 - correlation / MAX_SAMPLES;
        correlations[offset] = correlation;

        //if (correlation > 0.7 && correlation > lastCorrelation) {
        if (correlation > 0.7 && correlation > lastCorrelation) {
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
    // Cause I don't like using the passed value
    const f_p = freq_pitch;

    // If no signal is provided (i.e. -1) then return white
    if (f_p < 2 || f_p == undefined) {
        return 'rgb(255, 255, 255)';
    }

    // Deffine a Max Hrtz to create an value to covers the top RGB scale  
    const max_htz = 6000; // normal = 6000, guitar = 500
    // Creates the coefficent 
    const conversion_coe = (255) / (max_htz / 5) ;
    // Convert htz into what I call pitch points based on the coefficent calculated. It
    // Then distributes these points to the RGB values depending on what is the active 
    // stage. 
    var pitch_points = f_p * conversion_coe; 

    // Starting default value. Starts at red and ends at red
    var r_rgb = 255;
    var g_rgb = 0;
    var b_rgb = 0;

    // Stages that define what part of the RBG model it's currently progressing through
    var r_y_stage = true;
    var y_g_stage = false;
    var g_bb_stage = false;
    var bb_b_stage = false;
    var b_p_stage = false;
    var p_r_stage = false;

    // Functions of each stage that either lower or raise the rgb value
    function r_y() {g_rgb = g_rgb + 1;pitch_points = pitch_points - 1;}
    function y_g() {r_rgb = r_rgb - 1;pitch_points = pitch_points - 1;}
    function g_bb() {b_rgb = b_rgb + 1;pitch_points = pitch_points - 1;}
    function bb_b() {g_rgb = g_rgb - 1;pitch_points = pitch_points - 1;}
    function b_p() {r_rgb = r_rgb + 1;pitch_points = pitch_points - 1;}
    function p_r() {b_rgb = b_rgb - 1;pitch_points = pitch_points - 1;}


    while (pitch_points > 0) {
        if (r_y_stage == true) {
            r_y();
            if (g_rgb == 255) {r_y_stage = false;y_g_stage = true;}
        }
        if (y_g_stage == true) {
            y_g();
            if (r_rgb == 0) {y_g_stage = false;g_bb_stage = true;}
        }
        if (g_bb_stage == true) {
            g_bb();
            if (b_rgb == 255) {g_bb_stage = false;bb_b_stage = true;}
        }
        if (bb_b_stage == true) {
            bb_b();
            if (g_rgb == 0) {bb_b_stage = false;b_p_stage = true;}
        }
        if (b_p_stage == true) {
            b_p();
            if (r_rgb == 255) {b_p_stage = false;p_r_stage = true;}
        }
        if (p_r_stage == true) {
            p_r();
            if (b_rgb == 0) {p_r_stage = false;r_y_stage = true;}
        }
    }

    rgb_final = 'rgb';
    rgb_final = rgb_final.concat("(", r_rgb, ", ", g_rgb, ", ", b_rgb, ")");

    return rgb_final;
}



