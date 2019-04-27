"use strict";

var canvas;
var gl;

var numVertices  = 36;

var numChecks = 8;

var program;

var c;

var flag = true;

var pointsArray = [];
var normalsArray = [];

var vertices = [
    vec4( -0.5, -0.5,  0.5, 1.0 ),
    vec4( -0.5,  0.5,  0.5, 1.0 ),
    vec4( 0.5,  0.5,  0.5, 1.0 ),
    vec4( 0.5, -0.5,  0.5, 1.0 ),
    vec4( -0.5, -0.5, -0.5, 1.0 ),
    vec4( -0.5,  0.5, -0.5, 1.0 ),
    vec4( 0.5,  0.5, -0.5, 1.0 ),
    vec4( 0.5, -0.5, -0.5, 1.0 )
];

/*
var vertexColors = [
    vec4( 0.0, 0.0, 0.0, 1.0 ),  // black
    vec4( 1.0, 0.0, 0.0, 1.0 ),  // red
    vec4( 1.0, 1.0, 0.0, 1.0 ),  // yellow
    vec4( 0.0, 1.0, 0.0, 1.0 ),  // green
    vec4( 0.0, 0.0, 1.0, 1.0 ),  // blue
    vec4( 1.0, 0.0, 1.0, 1.0 ),  // magenta
    vec4( 0.0, 1.0, 1.0, 1.0 ),  // white
    vec4( 0.0, 1.0, 1.0, 1.0 )   // cyan
];
*/

var near = 0.3;
var far = 3.0;
var radius = 2.0;
var theta  = 45.0;
var phi    = 45.0;
var dr = 5.0 * Math.PI/180.0;

var  fovy = 45.0;  // Field-of-view in Y direction angle (in degrees)
var  aspect = 1.0;       // Viewport aspect ratio
var scaling = 1.0;    // Scaling transformation value
var translX = 0.0;
var translY = 0.0;
var translZ = 0.0;

var changeShading = true;

var lightPosition = vec4(1.0, 1.0, 1.0, 0.0 );
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0);
var materialSpecular = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialShininess = 100.0;

var ambientColor, diffuseColor, specularColor;

var modelViewMatrix, projectionMatrixLeft, projectionMatrixRight, scalingMatrix, translMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, scalingMatrixLoc, translMatrixLoc;
//var shadingModelLoc;

var eye;
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

function quad(a, b, c, d) {
    var t1 = subtract(vertices[b], vertices[a]);
    var t2 = subtract(vertices[c], vertices[b]);
    var normal = cross(t1, t2);
    var normal = vec3(normal);

    pointsArray.push(vertices[a]);
    normalsArray.push(normal);

    pointsArray.push(vertices[b]);
    normalsArray.push(normal);

    pointsArray.push(vertices[c]);
    normalsArray.push(normal);

    pointsArray.push(vertices[a]);
    normalsArray.push(normal);

    pointsArray.push(vertices[c]);
    normalsArray.push(normal);

    pointsArray.push(vertices[d]);
    normalsArray.push(normal);
}

function colorCube() {
    quad( 1, 0, 3, 2 );
    quad( 2, 3, 7, 6 );
    quad( 3, 0, 4, 7 );
    quad( 6, 5, 1, 2 );
    quad( 4, 5, 6, 7 );
    quad( 5, 4, 0, 1 );
}


window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    aspect = canvas.width/canvas.height;
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    colorCube();

    var nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW );

    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );

    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    //shadingModelLoc = gl.getUniformLocation( program, "shadingModel" );
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    scalingMatrixLoc = gl.getUniformLocation(program, "scalingMatrix");
    translMatrixLoc = gl.getUniformLocation(program, "translMatrix");

    var ambientProduct = mult(lightAmbient, materialAmbient);
    var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    var specularProduct = mult(lightSpecular, materialSpecular);

    // sliders for viewing parameters

    document.getElementById("zFarSlider").onchange = function(event) {
        far = event.target.value;
    };
    document.getElementById("zNearSlider").onchange = function(event) {
        near = event.target.value;
    };
    document.getElementById("radiusSlider").onchange = function(event) {
       radius = event.target.value;
    };
    document.getElementById("thetaSlider").onchange = function(event) {
        theta = event.target.value* Math.PI/180.0;
    };
    document.getElementById("phiSlider").onchange = function(event) {
        phi = event.target.value* Math.PI/180.0;
    };
    document.getElementById("fovSlider").onchange = function(event) {
        fovy = event.target.value;
    };
    document.getElementById("scaleSlider").onchange = function(event) {
        scaling = event.target.value;
    };
    document.getElementById("traslationSliderX").onchange = function(event) {
        translX = event.target.value;
    };
    document.getElementById("traslationSliderY").onchange = function(event) {
        translY = event.target.value;
    };
    document.getElementById("traslationSliderZ").onchange = function(event) {
        translZ = event.target.value;
    };
    document.getElementById("ShadingButton").onclick = function(){
        changeShading = !changeShading;
    };

    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"),flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct) );
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition) );

    gl.uniform1f(gl.getUniformLocation(program, "shininess"),materialShininess);

    render();
}

var render = function() {

    const width = gl.canvas.width;
    const height = gl.canvas.height;
    const displayWidth = gl.canvas.clientWidth;
    const displayHeight = gl.canvas.clientHeight;

    // render left part
    const dispWidthLeft = displayWidth / 2;
    const dispHeightLeft = displayHeight;
    const aspectLeft = dispWidthLeft/dispHeightLeft;
    projectionMatrixLeft = perspective(fovy, aspectLeft, near, far);
    gl.clearColor(0.1, 0.1, 0.1, 1);
    renderSinglePart(0, 0, width/2, height, projectionMatrixLeft);

    //render right part
    const dispWidthRight = displayWidth / 2;
    const dispHeightRight = displayHeight;
    const aspectRight = dispWidthRight/dispHeightRight;
    const top = 1, bottom = -1;
    const right = top * aspectRight, left = bottom * aspectRight;
    projectionMatrixRight = ortho(left, right, bottom, top, near, far);
    gl.clearColor(0.2, 0.2, 0.2, 1);
    renderSinglePart(width/2, 0, width/2, height, projectionMatrixRight);

    gl.uniform1f(gl.getUniformLocation(program, "changeShading"),changeShading);

    requestAnimFrame(render);
}

function renderSinglePart(startX, startY, lenghtWidth, lenghtHeight, projMatrix) {
    gl.enable(gl.SCISSOR_TEST);
    gl.viewport(startX, startY, lenghtWidth, lenghtHeight);
    gl.scissor(startX, startY, lenghtWidth, lenghtHeight);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    eye = vec3(radius*Math.sin(theta)*Math.cos(phi), radius*Math.sin(theta)*Math.sin(phi), radius*Math.cos(theta));
    modelViewMatrix = lookAt(eye, at , up);
    scalingMatrix = scalem(scaling, scaling, scaling);
    translMatrix = translate(translX, translY, translZ);

    gl.uniformMatrix4fv( scalingMatrixLoc, false, flatten(scalingMatrix) );
    gl.uniformMatrix4fv( translMatrixLoc, false, flatten(translMatrix) );
    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projMatrix) );

    gl.drawArrays( gl.TRIANGLES, 0, numVertices );
}
