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
const start_pos = width-110; 
const vert_pos = height / 2;
const strk_wght = 1.2; //Thickness of the line 
const space_between_lines = 1; //Thickness of space in between the lines 

// Initial testing vars. Will be replaced later when the sound lib is added
const line_length = 10; // Default value 
var mic_multiplier;
const input_amp = 2; // Amplifies the signal of mic_multiplier 
const line_color = 255; // Defulat value is White 

// Preload function to load images
function preload() {
    spkr_img = loadImage('img/speaker.png');
}

// Creates the drawing area 
function setup () {
    let cnv = createCanvas(width, height);
    // Mic Setup
    cnv.mousePressed(userStartAudio);
    textAlign(CENTER);
    mic_in = new p5.AudioIn();
    mic_freq = new p5.FFT();
    mic_in.start();
}

// What displays the lines 
function draw() {
    background(bkgrnd_color);

    // Mic interation
    text('tap to start', width/2, 20);
    mic_multiplier = mic_in.getLevel();
    //console.log(mic_in_level);

    // Add image of speaker 
    image(spkr_img, width-110, (height/2)-65), 20, 20;

    // Create new line to add to the array 
    noise_line.push(new AudioLine());
    
    // Adjust x-axis of each line and re-display. This creates the motion 
    for (let lyne = 0; lyne < noise_line.length; lyne++){
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
        this.x_pos = start_pos;
        this.y_pos = vert_pos; // Will be dtermined by audio input 
        this.lngth = line_length + ((mic_multiplier * input_amp) * height);
        this.thickness = strk_wght;
        this.color = line_color; // Will be dtermined by audio input
    }

    move() {
        /* Used to create the scrolling from right to left */
        this.x_pos = this.x_pos - (this.thickness * 2);
    }

    display() {
        line(this.x_pos, this.y_pos - (this.lngth/2), this.x_pos, this.y_pos + (this.lngth/2));
        strokeWeight(this.thickness);
        stroke(this.color);
    }
}//END AudioLine CLASS





