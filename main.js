///**
// * Created by VaibhavNamburi on 20/10/15.
// */
//
//var five = require('johnny-five'),
//    board = five.Board(),
//    arm,armAnimation,
//    right,rightAnimation,
//    left,leftAnimation,
//    base,baseAnimation;
//
//board.on("ready",function(){
//
//    arm = new five.Servo({
//        pin : 11,
//        range: [45,90]
//    });
//
//    armAnimation= new five.Animation(arm);
//
//    right = new five.Servo({
//        pin : 10,
//        center: true
//    });
//
//    rightAnimation= new five.Animation(right);
//
//    base = new five.Servo({
//        pin : 9,
//        range : [0,90]
//
//    });
//
//    baseAnimation= new five.Animation(base);
//
//    left = new five.Servo({
//        pin : 5,
//        range : [0,180]
//    });
//
//    leftAnimation= new five.Animation(left);
//
//    //leftAnimation.enqueue({
//    //    duration : 3000,
//    //    cuePoints : [0,0.25,0.5,0.75,1],
//    //    keyFrames : [{degrees: -45}, {degrees: 0}, {degrees: 45}, {degrees: 90}, {degrees: 180}]
//    //});
//
//    //arm.sweep();
//    //left.sweep();
//    //base.sweep();
//
//    board.repl.inject({
//        sl : left,
//        sr : right,
//        sb : base,
//        sa : arm
//    });
//
//});


//////////////////////////////////////////////////////////////////////////////


var Leap = require('leapjs');
var five = require('johnny-five');

// Defining all the servos
var board;
 var platformMotor;
  var shoulderMotor;
   var elbowMotor;
    var clawMotor;

// Different positions
var armLocation;
var armLocationHistory = [];
var myFingerDistance;
var leverAngles;

// All the servo inverse kinematic angles
var platformMotorAngle, shoulderMotorAngle, elbowMotorAngle, clawMotorAngle;
var frames = [];

// Max y and x values to restrict leap in envirnment
var MAX_Y = 200;
var MAX_Z = 400;
var MIN_Y = 0;
var MIN_Z = 0;

// All the pin numbers using naming convention
var P_BASE = 9;
var P_SHOULDER = 10;
var P_ELBOW = 6;
var P_CLAW = 11;

// Setting up the response by controlling the number of frames
var RESPONSE_SMOOTHNESS = 10;

function seperation(x1,y1,z1,x2,y2,z2) {
    return Math.sqrt(square(x2-x1)+square(y2-y1)+square(z2-z1));
}

function square(value) {
    return value*value;
}

function toDegrees(rad) {
    return rad*57;
}

var angleCalculator = function (y,z) {
    //pythagoras theorem to get the squares
    var hypotenuse = Math.sqrt(square(y)+square(z));
    var a = Math.atan(y/z);
    var b = Math.acos((square(long1)+square(hypotenuse)-square(long2))/(2*long1*hypotenuse));
    var angle1 = toDegrees(a+b);

    // Get second angle
    var c = Math.acos((square(long2)+square(long1)-square(hypotenuse))/(2*long1*long2));
    var angle2 = 180 - toDegrees(c);
    return {
        angle1: angle1,
        angle2: angle2
    }
}

// Leap motion controller
var controller = new Leap.Controller();

// Main Leap frame loop
controller.on('frame', function(frame) {
    // Hand position controls the robot arm position
    if(frame.hands.length > 0) {
        armLocation = frame.hands[0].palmPosition;//palm position is a leap variable referring to the central palm node

// Modulus z for always positive
        
        frame.hands[0].palmPosition[1] -= 123;
        frame.hands[0].palmPosition[2] = 134 + (-1*frame.hands[0].palmPosition[2]);

        var butteredInput = butterTheInput(armLocation);
        smoothingQueue(armLocation);

        if(butteredInput.y < MIN_Y) butteredInput.y = MIN_Y;
        if(butteredInput.y > MAX_Y) butteredInput.y = MAX_Y;
        if(butteredInput.z < MIN_Z) butteredInput.z = MIN_Z;
        if(butteredInput.z > MAX_Z) butteredInput.z = MAX_Z;
        


        leverAngles = angleCalculator(butteredInput.y, butteredInput.z);
        platformMotorAngle = calculateplatformMotorAngle(butteredInput.x, butteredInput.z);
        shoulderMotorAngle = leverAngles.angle1;
        elbowMotorAngle = leverAngles.angle2;
    }

    // Finger distance
    if(frame.pointables.length > 1) {
        f1 = frame.pointables[0];
        f2 = frame.pointables[1];
        myFingerDistance = seperation(f1.tipPosition[0],f1.tipPosition[1],f1.tipPosition[2],f2.tipPosition[0],f2.tipPosition[1],f2.tipPosition[2]);
        clawMotorAngle = 140-myFingerDistance;
    }
    frames.push(frame);
});

var smoothingQueue = function (current) {
    armLocationHistory.unshift(current);
    if (armLocationHistory.length > RESPONSE_SMOOTHNESS) {
        armLocationHistory.pop();
    }
}

// Arm length in millimeters
var long1 = 160;
var long2 = 160;

var calculateplatformMotorAngle = function (x,z) {
    var angle = Math.tan(x/z);
    return 90 - toDegrees(angle);
}



// Leap Motion connected
controller.on('connect', function(frame) {
    console.log("Leap Connected.");
    setTimeout(function() {
        var time = frames.length/2;
    }, 200);
});

controller.connect();

// Johnny-Five controller
board = new five.Board();
board.on('ready', function() {
    platformMotor = new five.Servo(P_BASE);
    shoulderMotor = new five.Servo(P_SHOULDER);
    elbowMotor = new five.Servo(P_ELBOW);
    clawMotor = new five.Servo(P_CLAW);

    // Setting up all the initial positions so that it doesnt crash
    platformMotor.to(0);
    shoulderMotor.to(45);
    elbowMotor.to(45);
    clawMotor.to(150);

    // Move each component
    this.loop(30, function() {
        if(!isNaN(shoulderMotorAngle) && !isNaN(elbowMotorAngle)) {
            shoulderMotor.to(shoulderMotorAngle);
            elbowMotor.to(elbowMotorAngle);
        } 
        if(platformMotorAngle >= 0 && platformMotorAngle <= 180) {
            platformMotor.to(platformMotorAngle);
        }
        if(clawMotorAngle >= 45 && clawMotorAngle <= 90) {
            clawMotor.to(clawMotorAngle);
        }
    });
});

//smoothes the frame rate
function butterTheInput(current) {
    if (armLocationHistory.length === 0) {
        return current;
    }

    var x = 0;
    var y = 0; 
    var z = 0;
    var totalDuration = armLocationHistory.length;

    for (var i = 0; i < totalDuration; i++) {
        x += current[0] + armLocationHistory[i][0];
        y += current[1] + armLocationHistory[i][1];
        z += current[2] + armLocationHistory[i][2];
    }

    totalDuration += 1; 
    return {x: x/totalDuration, y: y/totalDuration, z: z/totalDuration};
}



